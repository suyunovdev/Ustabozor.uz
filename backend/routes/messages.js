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
        const { chatId, senderId, content, attachments } = req.body;

        console.log('📨 Sending message:', { chatId, senderId, content: content?.substring(0, 30) });

        if (!chatId || !senderId || !content) {
            return res.status(400).json({ message: 'chatId, senderId, and content are required' });
        }

        const chatObjectId = toObjectId(chatId);
        const senderObjectId = toObjectId(senderId);

        const message = new Message({
            chatId: chatObjectId,
            senderId: senderObjectId,
            content,
            attachments,
            status: 'SENT'
        });

        // Save message and get chat in parallel
        const [savedMessage, chat] = await Promise.all([
            message.save(),
            Chat.findById(chatObjectId)
        ]);

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
        }

        await savedMessage.populate('senderId', 'name surname avatar');

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
