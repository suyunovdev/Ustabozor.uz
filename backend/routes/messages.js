const express = require('express');
const router = express.Router();
const { messagesRef } = require('../models/Message');
const { chatsRef } = require('../models/Chat');
const { notificationsRef } = require('../models/Notification');
const { docToObj, queryToArray, withTimestamps, populateUsers, FieldValue } = require('../models/firestore');
const { getDb } = require('../config/db');
const cache = require('../utils/cache');

// Get messages for a chat
router.get('/:chatId', async (req, res) => {
    const startTime = Date.now();
    try {
        const { chatId } = req.params;

        const cacheKey = `messages:${chatId}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`Messages served from cache in ${Date.now() - startTime}ms`);
            return res.json(cachedData);
        }

        const snapshot = await messagesRef()
            .where('chatId', '==', chatId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        let messages = queryToArray(snapshot);

        // Populate sender info
        const senderIds = messages.map(m => m.senderId);
        const usersMap = await populateUsers(senderIds, ['name', 'surname', 'avatar']);

        messages = messages.map(msg => ({
            ...msg,
            senderId: usersMap[msg.senderId] || { _id: msg.senderId, id: msg.senderId }
        }));

        messages.reverse();

        cache.set(cacheKey, messages, 2000);
        console.log(`Messages loaded from DB in ${Date.now() - startTime}ms (${messages.length} messages)`);
        res.json(messages);
    } catch (error) {
        console.error('Messages GET error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Send message
router.post('/', async (req, res) => {
    const startTime = Date.now();
    try {
        let { chatId, senderId, content, attachments } = req.body;

        if (attachments && typeof attachments === 'string') {
            try {
                attachments = JSON.parse(attachments);
            } catch (e) {
                attachments = undefined;
            }
        }

        if (!chatId || !senderId || !content) {
            return res.status(400).json({ message: 'chatId, senderId, and content are required' });
        }

        // Save message
        const msgRef = await messagesRef().add(withTimestamps({
            chatId,
            senderId,
            content,
            attachments: attachments || [],
            status: 'SENT'
        }));

        const savedMsg = await msgRef.get();
        const savedMessage = docToObj(savedMsg);

        // Get sender info
        const usersMap = await populateUsers([senderId], ['name', 'surname', 'avatar']);
        const senderInfo = usersMap[senderId] || { _id: senderId, id: senderId, name: 'Unknown' };
        savedMessage.senderId = senderInfo;

        // Update chat
        const chatDoc = await chatsRef().doc(chatId).get();
        if (chatDoc.exists) {
            const chatData = chatDoc.data();
            const updateData = {
                lastMessage: savedMessage._id,
                updatedAt: FieldValue.serverTimestamp()
            };

            // Increment unread counts for other participants
            const participants = chatData.participants || [];
            participants.forEach(participantId => {
                if (participantId !== senderId) {
                    updateData[`unreadCounts.${participantId}`] = FieldValue.increment(1);
                }
            });

            await chatsRef().doc(chatId).update(updateData);

            // Invalidate caches
            cache.delete(`messages:${chatId}`);
            participants.forEach(p => cache.delete(`chats:${p}`));

            // Create notifications for other participants
            const batch = getDb().batch();
            participants.forEach(participantId => {
                if (participantId !== senderId) {
                    const notifRef = notificationsRef().doc();
                    batch.set(notifRef, withTimestamps({
                        userId: participantId,
                        type: 'MESSAGE',
                        title: 'Yangi xabar',
                        message: `${senderInfo.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        relatedId: chatId,
                        isRead: false
                    }));
                }
            });
            batch.commit().catch(err => console.error('Error creating notifications:', err));
        }

        console.log(`Message sent in ${Date.now() - startTime}ms`);
        res.json(savedMessage);
    } catch (error) {
        console.error('Message POST error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete message
router.delete('/:messageId', async (req, res) => {
    try {
        const docRef = messagesRef().doc(req.params.messageId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const chatId = doc.data().chatId;
        await docRef.delete();
        cache.delete(`messages:${chatId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Message DELETE error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
