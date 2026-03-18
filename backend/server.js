require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { initializeFirebase } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Render.com proxy orqali ishlaydi — haqiqiy IP ni olish uchun
app.set('trust proxy', 1);

// Initialize Firebase
initializeFirebase();

// CORS — rate limitdan OLDIN bo'lishi kerak (preflight OPTIONS uchun)
const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(s => s.trim());
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else if (origin && origin.match(/^https:\/\/.*\.vercel\.app$/)) {
            // Vercel preview deployment'larga ruxsat berish
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false // SPA uchun o'chirildi
}));

// Rate limiting — umumiy (OPTIONS so'rovlarni o'tkazib yuborish)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 daqiqa
    max: 1000, // har 15 daqiqada 1000 ta so'rov (SPA polling + navigation)
    message: { message: 'Juda ko\'p so\'rov. Biroz kuting.' },
    skip: (req) => req.method === 'OPTIONS'
});
app.use(generalLimiter);

// Rate limiting — login/register uchun qattiqroq
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 daqiqa
    max: 20, // har 15 daqiqada 20 ta urinish
    message: { message: 'Juda ko\'p urinish. 15 daqiqadan keyin qaytadan urinib ko\'ring.' },
    skip: (req) => req.method === 'OPTIONS'
});

app.use(bodyParser.json());
app.use(bodyParser.text({ type: 'text/plain' })); // sendBeacon uchun

// --- ROUTES ---
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');
const chatsRoutes = require('./routes/chats');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/upload', require('./routes/upload'));

// Storage test endpoint
app.get('/api/test-storage', async (req, res) => {
    const { getBucket } = require('./config/db');
    const bucket = getBucket();
    if (!bucket) {
        return res.json({ ok: false, error: 'Bucket is null', env: process.env.FIREBASE_STORAGE_BUCKET ? 'SET' : 'NOT SET' });
    }
    try {
        const [exists] = await bucket.exists();
        res.json({ ok: exists, bucket: bucket.name, exists });
    } catch (e) {
        res.json({ ok: false, bucket: bucket.name, error: e.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Online status cleanup — har 5 daqiqada eskirgan "online" statuslarni tozalash
const ONLINE_TIMEOUT_MS = 5 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

async function cleanupStaleOnlineStatuses() {
    try {
        const { getDb } = require('./config/db');
        const db = getDb();
        const cutoff = new Date(Date.now() - ONLINE_TIMEOUT_MS).toISOString();

        const snapshot = await db.collection('users')
            .where('isOnline', '==', true)
            .get();

        if (snapshot.empty) return;

        const stale = snapshot.docs.filter(doc => {
            const lastSeen = doc.data().lastSeen;
            return !lastSeen || lastSeen < cutoff;
        });

        if (stale.length === 0) return;

        const batch = db.batch();
        stale.forEach(doc => {
            batch.update(doc.ref, { isOnline: false });
        });
        await batch.commit();
        console.log(`🧹 Online cleanup: ${stale.length} ta foydalanuvchi offline qilindi`);
    } catch (e) {
        console.error('Online cleanup error:', e.message);
    }
}

setInterval(cleanupStaleOnlineStatuses, CLEANUP_INTERVAL_MS);
