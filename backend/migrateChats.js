// Migration script to update old chats to new unreadCounts format
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

const chatSchema = new mongoose.Schema({
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    unreadCount: { type: Number },
    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    }
}, { timestamps: true });

const Chat = mongoose.model('Chat', chatSchema);

async function migrateChats() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const chats = await Chat.find({});
        console.log(`Found ${chats.length} chats to migrate`);

        for (const chat of chats) {
            // Initialize unreadCounts for all participants
            if (!chat.unreadCounts || chat.unreadCounts.size === 0) {
                chat.unreadCounts = new Map();
                chat.participants.forEach(participantId => {
                    chat.unreadCounts.set(participantId.toString(), 0);
                });
                await chat.save();
                console.log(`Migrated chat ${chat._id}`);
            }
        }

        console.log('Migration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

migrateChats();
