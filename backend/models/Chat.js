const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    unreadCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
