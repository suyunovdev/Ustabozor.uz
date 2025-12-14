const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Get messages for a chat
router.get('/:chatId', async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId })
            .populate('senderId', 'name surname avatar');
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Send message
router.post('/', async (req, res) => {
    try {
        const message = new Message(req.body);
        await message.save();

        // Update chat
        await Chat.findByIdAndUpdate(req.body.chatId, {
            lastMessage: message._id,
            $inc: { unreadCount: 1 }
        });

        await message.populate('senderId', 'name surname avatar');
        res.json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
