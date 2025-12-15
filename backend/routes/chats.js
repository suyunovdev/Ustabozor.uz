const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');

// Get chats for a user
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId;
        const query = userId ? { participants: userId } : {};
        const chats = await Chat.find(query)
            .populate('participants', 'name surname avatar role')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        // Convert unreadCounts Map to unreadCount for current user
        const chatsWithUnread = chats.map(chat => {
            const chatObj = chat.toObject();

            // Backward compatibility: if unreadCounts doesn't exist, use old unreadCount or 0
            let unreadCount = 0;
            if (chat.unreadCounts && chat.unreadCounts.get(userId)) {
                unreadCount = chat.unreadCounts.get(userId);
            } else if (chatObj.unreadCount !== undefined) {
                // Old format - use as-is but reset it later
                unreadCount = 0; // Reset old format to 0
            }

            chatObj.unreadCount = unreadCount;
            delete chatObj.unreadCounts;
            return chatObj;
        });

        res.json(chatsWithUnread);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create or get chat
router.post('/', async (req, res) => {
    try {
        const { participantIds } = req.body;

        let chat = await Chat.findOne({
            participants: { $all: participantIds }
        });

        if (!chat) {
            // Initialize unreadCounts for all participants
            const unreadCounts = new Map();
            participantIds.forEach(id => unreadCounts.set(id.toString(), 0));

            chat = new Chat({
                participants: participantIds,
                unreadCounts: unreadCounts
            });
            await chat.save();
        }

        await chat.populate('participants', 'name surname avatar role');

        const chatObj = chat.toObject();
        chatObj.unreadCount = 0;
        delete chatObj.unreadCounts;

        res.json(chatObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark chat as read for a user
router.put('/:chatId/read', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Initialize unreadCounts if it doesn't exist (backward compatibility)
        if (!chat.unreadCounts) {
            chat.unreadCounts = new Map();
            chat.participants.forEach(participantId => {
                chat.unreadCounts.set(participantId.toString(), 0);
            });
        }

        // Set unread count to 0 for this user
        chat.unreadCounts.set(userId.toString(), 0);
        await chat.save();

        // Also mark all messages as read
        await Message.updateMany(
            {
                chatId: chatId,
                senderId: { $ne: userId },
                status: { $ne: 'READ' }
            },
            { $set: { status: 'READ' } }
        );

        res.json({ success: true, message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get unread count for a user across all chats
router.get('/unread/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const chats = await Chat.find({ participants: userId });

        let totalUnread = 0;
        chats.forEach(chat => {
            totalUnread += chat.unreadCounts?.get(userId) || 0;
        });

        res.json({ unreadCount: totalUnread });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
