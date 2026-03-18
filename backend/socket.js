const { messagesRef } = require('./models/Message');
const { chatsRef } = require('./models/Chat');
const { getDb } = require('./config/db');
const { docToObj, withTimestamps, FieldValue } = require('./models/firestore');
const cache = require('./utils/cache');

// Online foydalanuvchilar: userId → Set of socketIds
const onlineUsers = new Map();

const initSocket = (io) => {

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // ─── USER ONLINE ──────────────────────────────────────────
        socket.on('user:online', async ({ userId }) => {
            if (!userId) return;

            socket.userId = userId;
            socket.join(`user:${userId}`);

            if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
            onlineUsers.get(userId).add(socket.id);

            // Firestore'da online qilish
            try {
                await getDb().collection('users').doc(userId).update({
                    isOnline: true,
                    lastSeen: new Date().toISOString()
                });
            } catch (e) { /* ignore */ }

            // Boshqa foydalanuvchilarga xabar
            socket.broadcast.emit('user:status', { userId, isOnline: true });
            console.log(`👤 ${userId} online (${onlineUsers.size} unique users)`);
        });

        // ─── CHAT ROOM JOIN ───────────────────────────────────────
        socket.on('chat:join', ({ chatId }) => {
            if (!chatId) return;
            socket.join(`chat:${chatId}`);
            socket.currentChatId = chatId;
        });

        // ─── CHAT ROOM LEAVE ──────────────────────────────────────
        socket.on('chat:leave', ({ chatId }) => {
            if (!chatId) return;
            socket.leave(`chat:${chatId}`);
            if (socket.currentChatId === chatId) socket.currentChatId = null;
        });

        // ─── SEND MESSAGE ─────────────────────────────────────────
        socket.on('message:send', async ({ chatId, senderId, content, attachments }, ack) => {
            if (!chatId || !senderId || !content?.trim()) {
                if (ack) ack({ error: 'Missing fields' });
                return;
            }

            try {
                // Firestore'ga saqlash
                const msgData = withTimestamps({
                    chatId,
                    senderId,
                    content: content.trim(),
                    status: 'SENT',
                    attachments: attachments || []
                });

                const docRef = await messagesRef().add(msgData);
                const doc = await docRef.get();
                const message = docToObj(doc);

                // Chat lastMessage + unreadCount yangilash
                const chatDoc = await chatsRef().doc(chatId).get();
                if (chatDoc.exists) {
                    const chatData = chatDoc.data();
                    const participants = chatData.participants || [];
                    const unreadUpdate = {};
                    participants.forEach(pid => {
                        if (pid !== senderId) {
                            const current = (chatData.unreadCounts || {})[pid] || 0;
                            unreadUpdate[`unreadCounts.${pid}`] = current + 1;
                        }
                    });

                    await chatsRef().doc(chatId).update({
                        lastMessage: message.id,
                        ...unreadUpdate,
                        updatedAt: FieldValue.serverTimestamp()
                    });
                }

                // Cache tozalash
                cache.delete(`messages:${chatId}`);

                // Chat room dagi barcha foydalanuvchilarga yangi xabar
                io.to(`chat:${chatId}`).emit('message:new', message);

                // Chat room da bo'lmagan ishtirokchilar uchun chat:updated yuborish
                const chatSnap = await chatsRef().doc(chatId).get();
                if (chatSnap.exists) {
                    (chatSnap.data().participants || []).forEach(pid => {
                        if (pid !== senderId) {
                            cache.delete(`chats:${pid}`);
                            io.to(`user:${pid}`).emit('chat:updated', { chatId });
                        }
                    });
                }

                // Sender ga tasdiqlash
                if (ack) ack({ success: true, message });

                // DELIVERED: agar boshqa ishtirokchi chat roomda bo'lsa
                const roomSockets = await io.in(`chat:${chatId}`).fetchSockets();
                const deliveredTo = roomSockets
                    .filter(s => s.userId && s.userId !== senderId)
                    .map(s => s.userId);

                if (deliveredTo.length > 0) {
                    await messagesRef().doc(message.id).update({ status: 'DELIVERED' });
                    cache.delete(`messages:${chatId}`);
                    io.to(`chat:${chatId}`).emit('message:status:update', {
                        messageId: message.id,
                        status: 'DELIVERED'
                    });
                }

            } catch (err) {
                console.error('Socket message:send error:', err);
                if (ack) ack({ error: err.message });
            }
        });

        // ─── TYPING ───────────────────────────────────────────────
        socket.on('typing:start', ({ chatId, userId }) => {
            if (!chatId || !userId) return;
            socket.to(`chat:${chatId}`).emit('typing', { userId, chatId, isTyping: true });
        });

        socket.on('typing:stop', ({ chatId, userId }) => {
            if (!chatId || !userId) return;
            socket.to(`chat:${chatId}`).emit('typing', { userId, chatId, isTyping: false });
        });

        // ─── MESSAGES READ ────────────────────────────────────────
        socket.on('messages:read', async ({ chatId, userId }) => {
            if (!chatId || !userId) return;
            try {
                // Firestore'da READ qilish
                const snapshot = await messagesRef()
                    .where('chatId', '==', chatId)
                    .where('status', 'in', ['SENT', 'DELIVERED'])
                    .get();

                if (!snapshot.empty) {
                    const batch = getDb().batch();
                    snapshot.docs.forEach(doc => {
                        if (doc.data().senderId !== userId) {
                            batch.update(doc.ref, { status: 'READ' });
                        }
                    });
                    await batch.commit();
                    cache.delete(`messages:${chatId}`);

                    // Sender ga READ xabari
                    io.to(`chat:${chatId}`).emit('messages:read:ack', { chatId, readBy: userId });
                }

                // Unread count nolga tushirish
                await chatsRef().doc(chatId).update({
                    [`unreadCounts.${userId}`]: 0
                });
                cache.delete(`chats:${userId}`);

            } catch (e) { console.error('messages:read error:', e); }
        });

        // ─── MESSAGES DELIVERED ───────────────────────────────────
        socket.on('messages:delivered', async ({ chatId, userId }) => {
            if (!chatId || !userId) return;
            try {
                const snapshot = await messagesRef()
                    .where('chatId', '==', chatId)
                    .where('status', '==', 'SENT')
                    .get();

                if (!snapshot.empty) {
                    const batch = getDb().batch();
                    let count = 0;
                    snapshot.docs.forEach(doc => {
                        if (doc.data().senderId !== userId) {
                            batch.update(doc.ref, { status: 'DELIVERED' });
                            count++;
                        }
                    });
                    if (count > 0) {
                        await batch.commit();
                        cache.delete(`messages:${chatId}`);
                        io.to(`chat:${chatId}`).emit('messages:delivered:ack', { chatId });
                    }
                }
            } catch (e) { /* ignore */ }
        });

        // ─── DISCONNECT ───────────────────────────────────────────
        socket.on('disconnect', async () => {
            const userId = socket.userId;
            if (!userId) return;

            const sockets = onlineUsers.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    onlineUsers.delete(userId);

                    // Firestore'da offline qilish
                    try {
                        await getDb().collection('users').doc(userId).update({
                            isOnline: false,
                            lastSeen: new Date().toISOString()
                        });
                    } catch (e) { /* ignore */ }

                    socket.broadcast.emit('user:status', { userId, isOnline: false });
                    console.log(`👤 ${userId} offline`);
                }
            }

            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    return io;
};

// Online foydalanuvchi tekshirish
const isUserOnline = (userId) => onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;

module.exports = { initSocket, isUserOnline };
