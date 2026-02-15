const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const { usersRef } = require('../models/User');
const { ordersRef } = require('../models/Order');
const { chatsRef } = require('../models/Chat');
const { messagesRef } = require('../models/Message');
const { notificationsRef } = require('../models/Notification');
const { reportsRef } = require('../models/Report');
const { docToObj, queryToArray, withUpdatedAt, FieldValue } = require('../models/firestore');
const { getBucket, getDb } = require('../config/db');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');
const cache = require('../utils/cache');

const USERS_CACHE_TTL = 60000; // 1 daqiqa
const USERS_NAMESPACE = 'users';

const invalidateUsersCache = () => {
    cache.deleteNamespace(USERS_NAMESPACE);
};

// Configure Multer for memory storage (Firebase Storage upload)
const upload = multer({ storage: multer.memoryStorage() });

// Get all users or filter by role
router.get('/', async (req, res) => {
    try {
        const role = req.query.role;
        const includeDeleted = req.query.includeDeleted === 'true';
        const cacheKey = `users:list:${role || 'all'}:${includeDeleted}`;

        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        let query = usersRef();

        if (role) {
            query = query.where('role', '==', role);
        }

        const snapshot = await query.get();
        let users = queryToArray(snapshot);

        // O'chirilganlarni yashirish (admin so'ramasa)
        if (!includeDeleted) {
            users = users.filter(u => !u.isDeleted);
        }

        cache.set(cacheKey, users, { ttl: USERS_CACHE_TTL, namespace: USERS_NAMESPACE });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const cacheKey = `users:${req.params.id}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.json(cached);

        const doc = await usersRef().doc(req.params.id).get();
        if (doc.exists) {
            const user = docToObj(doc);
            cache.set(cacheKey, user, { ttl: USERS_CACHE_TTL, namespace: USERS_NAMESPACE });
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.put('/:id', upload.single('avatar'), async (req, res) => {
    try {
        const updatedData = { ...req.body };

        // Xavfsizlik: client o'zgartirmasligi kerak bo'lgan fieldlarni olib tashlash
        delete updatedData.id;
        delete updatedData._id;
        delete updatedData.password;
        delete updatedData.role;
        delete updatedData.createdAt;
        delete updatedData.balance;
        delete updatedData.rating;
        delete updatedData.ratingCount;
        delete updatedData.completedJobs;

        // Convert numeric strings to numbers
        if (updatedData.hourlyRate) updatedData.hourlyRate = Number(updatedData.hourlyRate);

        // Convert boolean strings
        if (typeof updatedData.isOnline === 'string') {
            updatedData.isOnline = updatedData.isOnline === 'true';
        }

        // Handle location object
        if (updatedData.location) {
            if (typeof updatedData.location === 'string') {
                try { updatedData.location = JSON.parse(updatedData.location); } catch (e) { /* keep as is */ }
            }
            if (updatedData.location.lat) updatedData.location.lat = Number(updatedData.location.lat);
            if (updatedData.location.lng) updatedData.location.lng = Number(updatedData.location.lng);
        }

        // Handle skills array
        if (typeof updatedData.skills === 'string') {
            try {
                updatedData.skills = JSON.parse(updatedData.skills);
            } catch (e) {
                // Keep as is
            }
        }

        // Upload avatar to Firebase Storage
        if (req.file) {
            const bucket = getBucket();
            if (!bucket) {
                return res.status(500).json({ message: 'Firebase Storage sozlanmagan.' });
            }
            try {
                const token = crypto.randomUUID();
                const fileName = `uploads/avatars/${Date.now()}-${req.file.originalname}`;
                const file = bucket.file(fileName);
                await file.save(req.file.buffer, {
                    metadata: {
                        contentType: req.file.mimetype,
                        metadata: {
                            firebaseStorageDownloadTokens: token
                        }
                    }
                });
                updatedData.avatar = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
                console.log('Avatar uploaded:', updatedData.avatar);
            } catch (uploadError) {
                console.error('Avatar upload error:', uploadError.message);
                return res.status(500).json({ message: 'Avatar yuklashda xato: ' + uploadError.message });
            }
        }

        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await docRef.update(withUpdatedAt(updatedData));
        const updated = await docRef.get();
        invalidateUsersCache();
        res.json(docToObj(updated));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle online status
router.put('/:id/online', async (req, res) => {
    try {
        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const currentStatus = doc.data().isOnline || false;
        await docRef.update(withUpdatedAt({ isOnline: !currentStatus }));
        const updated = await docRef.get();
        invalidateUsersCache();
        res.json(docToObj(updated));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Heartbeat — foydalanuvchi tirik ekanligini bildiradi
router.post('/:id/heartbeat', async (req, res) => {
    try {
        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        await docRef.update({
            isOnline: true,
            lastSeen: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Offline qilish — sahifa yopilganda
router.post('/:id/offline', async (req, res) => {
    try {
        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }
        await docRef.update({
            isOnline: false,
            lastSeen: new Date().toISOString()
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Soft delete user + cascading delete (bog'liq ma'lumotlarni tozalash)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = usersRef().doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Soft delete user
        await docRef.update({
            isDeleted: true,
            deletedAt: new Date().toISOString()
        });

        // 2. Buyurtmalarni bekor qilish (PENDING/ACCEPTED — customer sifatida)
        const customerOrders = await ordersRef().where('customerId', '==', id).get();
        for (const orderDoc of customerOrders.docs) {
            const data = orderDoc.data();
            if (['PENDING', 'ACCEPTED'].includes(data.status)) {
                await orderDoc.ref.update({ status: 'CANCELLED', cancelledAt: new Date().toISOString() });
            }
        }

        // Worker sifatida — buyurtmani PENDING ga qaytarish (boshqa worker olishi uchun)
        const workerOrders = await ordersRef().where('workerId', '==', id).get();
        for (const orderDoc of workerOrders.docs) {
            const data = orderDoc.data();
            if (['ACCEPTED', 'IN_PROGRESS'].includes(data.status)) {
                await orderDoc.ref.update({ workerId: null, status: 'PENDING' });
            }
        }

        // 3. Chatlar va xabarlarni o'chirish
        const chats = await chatsRef().where('participants', 'array-contains', id).get();
        for (const chatDoc of chats.docs) {
            const msgs = await messagesRef().where('chatId', '==', chatDoc.id).get();
            const db = getDb();
            // Firestore batch max 500, katta chatlar uchun bo'lib yuborish
            const batchSize = 400;
            for (let i = 0; i < msgs.docs.length; i += batchSize) {
                const batch = db.batch();
                msgs.docs.slice(i, i + batchSize).forEach(m => batch.delete(m.ref));
                if (i + batchSize >= msgs.docs.length) {
                    batch.delete(chatDoc.ref); // Oxirgi batchda chat documentni ham o'chirish
                }
                await batch.commit();
            }
            // Agar xabar bo'lmasa, faqat chatni o'chirish
            if (msgs.docs.length === 0) {
                await chatDoc.ref.delete();
            }
        }

        // 4. Bildirishnomalarni o'chirish
        const notifs = await notificationsRef().where('userId', '==', id).get();
        if (!notifs.empty) {
            const db = getDb();
            const batch = db.batch();
            notifs.docs.forEach(n => batch.delete(n.ref));
            await batch.commit();
        }

        // 5. Reportlarni o'chirish (foydalanuvchi yuborgan)
        const reports = await reportsRef().where('reporterId', '==', id).get();
        if (!reports.empty) {
            const db = getDb();
            const batch = db.batch();
            reports.docs.forEach(r => batch.delete(r.ref));
            await batch.commit();
        }

        console.log(`User ${id} deleted with cascade: ${customerOrders.size + workerOrders.size} orders, ${chats.size} chats, ${notifs.size} notifications, ${reports.size} reports`);

        res.json({ success: true, message: 'Foydalanuvchi va bog\'liq ma\'lumotlar o\'chirildi' });
    } catch (error) {
        console.error('Cascade delete error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Restore deleted user (qayta tiklash)
router.post('/:id/restore', requireAuth, requireAdmin, async (req, res) => {
    try {
        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await docRef.update({
            isDeleted: false,
            deletedAt: null
        });
        res.json({ success: true, message: 'Foydalanuvchi qayta tiklandi' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin ban/unban user
router.post('/:id/ban', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { action, reason, duration } = req.body;
        if (!action || !['ban', 'unban'].includes(action)) {
            return res.status(400).json({ message: 'action "ban" yoki "unban" bo\'lishi kerak' });
        }

        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
        }

        const userData = doc.data();
        const now = new Date();

        if (action === 'ban') {
            // Muddatni hisoblash
            let blockedUntil = null;
            let durationText = 'Doimiy';
            if (duration && duration !== 'permanent') {
                const durations = {
                    '1h': { ms: 60 * 60 * 1000, text: '1 soat' },
                    '24h': { ms: 24 * 60 * 60 * 1000, text: '24 soat' },
                    '7d': { ms: 7 * 24 * 60 * 60 * 1000, text: '7 kun' },
                    '30d': { ms: 30 * 24 * 60 * 60 * 1000, text: '30 kun' }
                };
                const d = durations[duration];
                if (d) {
                    blockedUntil = new Date(now.getTime() + d.ms).toISOString();
                    durationText = d.text;
                }
            }

            await docRef.update({
                isBanned: true,
                blockReason: reason || 'Sabab ko\'rsatilmagan',
                blockedUntil: blockedUntil,
                blockedAt: now.toISOString(),
                isOnline: false,
                updatedAt: FieldValue.serverTimestamp()
            });

            // Telegram xabar yuborish
            if (userData.telegramId) {
                try {
                    const telegramRoutes = require('./telegram');
                    if (telegramRoutes.sendTelegramMessage) {
                        const msg = `⚠️ <b>Hisobingiz bloklandi</b>\n\n` +
                            `📋 <b>Sabab:</b> ${reason || 'Ko\'rsatilmagan'}\n` +
                            `⏰ <b>Muddat:</b> ${durationText}\n` +
                            `📅 <b>Sana:</b> ${now.toLocaleDateString('uz-UZ')}\n\n` +
                            `Agar noto'g'ri bloklangan deb hisoblasangiz, admin bilan bog'laning.`;
                        await telegramRoutes.sendTelegramMessage(userData.telegramId, msg);
                    }
                } catch (e) {
                    console.error('Telegram ban notification error:', e.message);
                }
            }

            // In-app notification yaratish
            try {
                const { getDb } = require('../config/db');
                const db = getDb();
                await db.collection('notifications').add({
                    userId: req.params.id,
                    type: 'SYSTEM',
                    title: 'Hisob bloklandi',
                    message: `Sabab: ${reason || 'Ko\'rsatilmagan'}. Muddat: ${durationText}`,
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.error('Notification create error:', e.message);
            }

            const updated = await docRef.get();
            res.json({ success: true, message: 'Foydalanuvchi bloklandi', user: docToObj(updated) });

        } else {
            // Unban
            await docRef.update({
                isBanned: false,
                blockReason: FieldValue.delete(),
                blockedUntil: FieldValue.delete(),
                blockedAt: FieldValue.delete(),
                updatedAt: FieldValue.serverTimestamp()
            });

            // Telegram xabar
            if (userData.telegramId) {
                try {
                    const telegramRoutes = require('./telegram');
                    if (telegramRoutes.sendTelegramMessage) {
                        const msg = `✅ <b>Hisobingiz blokdan chiqarildi</b>\n\n` +
                            `Platformadan yana foydalanishingiz mumkin.`;
                        await telegramRoutes.sendTelegramMessage(userData.telegramId, msg);
                    }
                } catch (e) {
                    console.error('Telegram unban notification error:', e.message);
                }
            }

            // In-app notification
            try {
                const { getDb } = require('../config/db');
                const db = getDb();
                await db.collection('notifications').add({
                    userId: req.params.id,
                    type: 'SYSTEM',
                    title: 'Hisob blokdan chiqarildi',
                    message: 'Platformadan yana foydalanishingiz mumkin.',
                    isRead: false,
                    createdAt: FieldValue.serverTimestamp()
                });
            } catch (e) {
                console.error('Notification create error:', e.message);
            }

            const updated = await docRef.get();
            res.json({ success: true, message: 'Blokdan chiqarildi', user: docToObj(updated) });
        }
    } catch (error) {
        console.error('Ban error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Block user (individual user blocking)
router.post('/:id/block', async (req, res) => {
    try {
        const { blockedUserId } = req.body;
        if (!blockedUserId) {
            return res.status(400).json({ message: 'Blocked User ID is required' });
        }

        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await docRef.update({
            blockedUsers: FieldValue.arrayUnion(blockedUserId),
            updatedAt: FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'User blocked' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
