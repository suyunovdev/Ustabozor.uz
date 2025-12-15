const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Chat = require('../models/Chat');

// Get messages for a chat
router.get('/:chatId', async (req, res) => {
    try {
        const messages = await Message.find({ chatId: req.params.chatId })
            .populate('senderId', 'name surname avatar')
            .sort({ createdAt: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Send message
router.post('/', async (req, res) => {
    try {
        const { chatId, senderId, content, attachments } = req.body;

        // Create new message
        const message = new Message({
            chatId,
            senderId,
            content,
            attachments,
            status: 'SENT'
        });
        await message.save();

        // Get chat to find other participants
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Increment unread count for all participants EXCEPT sender
        chat.participants.forEach(participantId => {
            const participantIdStr = participantId.toString();
            if (participantIdStr !== senderId.toString()) {
                const currentCount = chat.unreadCounts?.get(participantIdStr) || 0;
                chat.unreadCounts.set(participantIdStr, currentCount + 1);
            }
        });

        // Update lastMessage
        chat.lastMessage = message._id;
        await chat.save();

        await message.populate('senderId', 'name surname avatar');
        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
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
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
