const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');

// Get chats
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId;
        const query = userId ? { participants: userId } : {};
        const chats = await Chat.find(query)
            .populate('participants', 'name surname avatar')
            .populate('lastMessage');
        res.json(chats);
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
            chat = new Chat({
                participants: participantIds,
                unreadCount: 0
            });
            await chat.save();
        }

        await chat.populate('participants', 'name surname avatar');
        res.json(chat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
