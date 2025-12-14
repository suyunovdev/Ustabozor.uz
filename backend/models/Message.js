const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['SENT', 'DELIVERED', 'READ'], default: 'SENT' },
    attachments: [{
        name: String,
        url: String,
        type: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
