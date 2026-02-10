const express = require('express');
const router = express.Router();
const { chatsRef } = require('../models/Chat');
const { messagesRef } = require('../models/Message');
const { usersRef } = require('../models/User');
const { docToObj, queryToArray, withTimestamps, populateUsers, FieldValue } = require('../models/firestore');
const { getDb } = require('../config/db');
const cache = require('../utils/cache');

// Get chats for a user
router.get('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.json([]);
        }

        const cacheKey = `chats:${userId}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`Chats served from cache in ${Date.now() - startTime}ms`);
            return res.json(cachedData);
        }

        // Query chats where user is a participant
        const snapshot = await chatsRef()
            .where('participants', 'array-contains', userId)
            .orderBy('updatedAt', 'desc')
            .limit(50)
            .get();

        const chats = queryToArray(snapshot);

        // Collect all participant IDs and lastMessage IDs
        const allParticipantIds = new Set();
        const lastMessageIds = [];
        chats.forEach(chat => {
            (chat.participants || []).forEach(id => allParticipantIds.add(id));
            if (chat.lastMessage) lastMessageIds.push(chat.lastMessage);
        });

        // Batch fetch users
        const usersMap = await populateUsers([...allParticipantIds], ['name', 'surname', 'avatar', 'role', 'isOnline']);

        // Batch fetch last messages
        const messagesMap = {};
        if (lastMessageIds.length > 0) {
            const msgRefs = lastMessageIds.map(id => messagesRef().doc(id));
            const msgDocs = await getDb().getAll(...msgRefs);
            msgDocs.forEach(doc => {
                if (doc.exists) {
                    messagesMap[doc.id] = docToObj(doc);
                }
            });
        }

        // Assemble results
        const chatsWithDetails = chats.map(chat => {
            const participantDetails = (chat.participants || []).map(id =>
                usersMap[id] || { _id: id, id }
            );
            const lastMessage = chat.lastMessage ? messagesMap[chat.lastMessage] || null : null;
            const unreadCount = (chat.unreadCounts && chat.unreadCounts[userId]) || 0;

            return {
                _id: chat._id,
                id: chat.id,
                participants: participantDetails,
                lastMessage,
                unreadCount,
                createdAt: chat.createdAt,
                updatedAt: chat.updatedAt
            };
        });

        cache.set(cacheKey, chatsWithDetails, { ttl: 3000 });
        console.log(`Chats loaded from DB in ${Date.now() - startTime}ms for user ${userId}`);
        res.json(chatsWithDetails);
    } catch (error) {
        console.error('Chat GET error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create or get chat between two users
router.post('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const { participantIds } = req.body;

        if (!participantIds || participantIds.length < 2) {
            return res.status(400).json({ message: 'At least 2 participant IDs required' });
        }

        // Find existing chat: query for chats containing first user, then filter
        const snapshot = await chatsRef()
            .where('participants', 'array-contains', participantIds[0])
            .get();

        let existingChat = null;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.participants.length === participantIds.length &&
                participantIds.every(id => data.participants.includes(id))) {
                existingChat = docToObj(doc);
            }
        });

        if (!existingChat) {
            // Create new chat
            const unreadCounts = {};
            participantIds.forEach(id => { unreadCounts[id] = 0; });

            const chatRef = await chatsRef().add(withTimestamps({
                participants: participantIds,
                unreadCounts,
                lastMessage: null
            }));

            const newDoc = await chatRef.get();
            existingChat = docToObj(newDoc);
        }

        // Get participant details
        const usersMap = await populateUsers(participantIds, ['name', 'surname', 'avatar', 'role', 'isOnline']);
        const participants = participantIds.map(id => usersMap[id] || { _id: id, id });

        // Invalidate cache
        participantIds.forEach(id => cache.delete(`chats:${id}`));

        const result = {
            _id: existingChat._id,
            id: existingChat.id,
            participants,
            unreadCount: 0,
            createdAt: existingChat.createdAt,
            updatedAt: existingChat.updatedAt
        };

        console.log(`Chat ready in ${Date.now() - startTime}ms`);
        res.json(result);
    } catch (error) {
        console.error('Chat POST error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Mark chat as read
router.put('/:chatId/read', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        await chatsRef().doc(chatId).update({
            [`unreadCounts.${userId}`]: 0,
            updatedAt: FieldValue.serverTimestamp()
        });

        // Update messages status in background
        const msgSnapshot = await messagesRef()
            .where('chatId', '==', chatId)
            .where('status', 'in', ['SENT', 'DELIVERED'])
            .get();

        if (!msgSnapshot.empty) {
            const batch = getDb().batch();
            msgSnapshot.docs.forEach(doc => {
                if (doc.data().senderId !== userId) {
                    batch.update(doc.ref, { status: 'READ' });
                }
            });
            batch.commit().catch(err => console.error('Error updating message status:', err));
        }

        cache.delete(`chats:${userId}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get unread count
router.get('/unread/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const snapshot = await chatsRef()
            .where('participants', 'array-contains', userId)
            .get();

        let totalUnread = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.unreadCounts && data.unreadCounts[userId]) {
                totalUnread += data.unreadCounts[userId];
            }
        });

        res.json({ unreadCount: totalUnread });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Clear chat history
router.delete('/:chatId/messages', async (req, res) => {
    try {
        const { chatId } = req.params;

        // Delete all messages in chat (batch, max 500)
        const msgSnapshot = await messagesRef()
            .where('chatId', '==', chatId)
            .get();

        if (!msgSnapshot.empty) {
            const batch = getDb().batch();
            msgSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        await chatsRef().doc(chatId).update({
            lastMessage: null,
            updatedAt: FieldValue.serverTimestamp()
        });

        cache.delete(`messages:${chatId}`);
        res.json({ success: true, message: 'Chat history cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
