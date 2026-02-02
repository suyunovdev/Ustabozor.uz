const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const cache = require('../utils/cache');

// Helper to convert string ID to ObjectId safely
const toObjectId = (id) => {
    try {
        if (mongoose.Types.ObjectId.isValid(id)) {
            return new mongoose.Types.ObjectId(id);
        }
        return id;
    } catch (e) {
        return id;
    }
};

// Get messages for a chat - OPTIMIZED WITH CACHE
router.get('/:chatId', async (req, res) => {
    const startTime = Date.now();
    try {
        const { chatId } = req.params;

        // Check cache first
        const cacheKey = `messages:${chatId}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`⚡ Messages served from cache in ${Date.now() - startTime}ms`);
            return res.json(cachedData);
        }

        const chatObjectId = toObjectId(chatId);

        // Use lean() and limit for performance
        const messages = await Message.find({ chatId: chatObjectId })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('senderId', 'name surname avatar')
            .lean();

        // Reverse to get chronological order
        messages.reverse();

        // Cache for 2 seconds
        cache.set(cacheKey, messages, 2000);

        console.log(`⚡ Messages loaded from DB in ${Date.now() - startTime}ms (${messages.length} messages)`);
        res.json(messages);
    } catch (error) {
        console.error('Messages GET error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Send message - OPTIMIZED
router.post('/', async (req, res) => {
    const startTime = Date.now();
    try {
        let { chatId, senderId, content, attachments } = req.body;

        console.log('📨 Sending message:', { chatId, senderId, content: content?.substring(0, 30) });
        console.log('📎 Attachments received:', JSON.stringify(attachments, null, 2));
        console.log('📎 Attachments type:', typeof attachments, Array.isArray(attachments));

        // Parse attachments if it's a string
        if (attachments && typeof attachments === 'string') {
            try {
                attachments = JSON.parse(attachments);
                console.log('📎 Attachments parsed:', attachments);
            } catch (e) {
                console.error('Failed to parse attachments:', e);
                attachments = undefined;
            }
        }

        if (!chatId || !senderId || !content) {
            return res.status(400).json({ message: 'chatId, senderId, and content are required' });
        }

        const chatObjectId = toObjectId(chatId);
        const senderObjectId = toObjectId(senderId);

        const message = new Message({
            chatId: chatObjectId,
            senderId: senderObjectId,
            content,
            attachments: attachments || [],
            status: 'SENT'
        });

        // Save message and get chat in parallel
        let [savedMessage, chat] = await Promise.all([
            message.save(),
            Chat.findById(chatObjectId)
        ]);

        // Populate sender info immediately
        savedMessage = await savedMessage.populate('senderId', 'name surname avatar');

        if (chat) {
            const updateOps = {};
            chat.participants.forEach(participantId => {
                const participantIdStr = participantId.toString();
                if (participantIdStr !== senderId.toString()) {
                    updateOps[`unreadCounts.${participantIdStr}`] = 1;
                }
            });

            await Chat.findByIdAndUpdate(chatObjectId, {
                $set: { lastMessage: savedMessage._id, updatedAt: new Date() },
                $inc: updateOps
            });

            // Invalidate caches
            cache.delete(`messages:${chatId}`);
            chat.participants.forEach(p => cache.delete(`chats:${p.toString()}`));

            // Create notifications for other participants
            const Notification = require('../models/Notification');
            const notifications = [];

            chat.participants.forEach(participantId => {
                const participantIdStr = participantId.toString();
                if (participantIdStr !== senderId.toString()) {
                    notifications.push({
                        userId: participantId,
                        type: 'MESSAGE',
                        title: 'Yangi xabar',
                        message: `${savedMessage.senderId.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
                        relatedId: chatId,
                        isRead: false,
                        createdAt: new Date()
                    });
                }
            });

            if (notifications.length > 0) {
                Notification.insertMany(notifications).catch(err =>
                    console.error('Error creating notifications:', err)
                );
            }
        }



        console.log(`⚡ Message sent in ${Date.now() - startTime}ms`);
        res.json(savedMessage);
    } catch (error) {
        console.error('Message POST error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete message
router.delete('/:messageId', async (req, res) => {
    try {
        const message = await Message.findByIdAndDelete(req.params.messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }
        // Invalidate message cache
        cache.delete(`messages:${message.chatId}`);
        res.json({ success: true });
    } catch (error) {
        console.error('Message DELETE error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
