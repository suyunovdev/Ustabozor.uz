// Script to create MongoDB indexes for better performance
require('dotenv').config();
const mongoose = require('mongoose');

async function createIndexes() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        console.log('📊 Creating indexes...');

        // Chat collection indexes
        console.log('  - Creating Chat indexes...');
        await db.collection('chats').createIndex({ participants: 1 });
        await db.collection('chats').createIndex({ updatedAt: -1 });
        await db.collection('chats').createIndex({ participants: 1, updatedAt: -1 });
        console.log('    ✅ Chat indexes created');

        // Message collection indexes
        console.log('  - Creating Message indexes...');
        await db.collection('messages').createIndex({ chatId: 1 });
        await db.collection('messages').createIndex({ chatId: 1, createdAt: -1 });
        await db.collection('messages').createIndex({ chatId: 1, senderId: 1, status: 1 });
        console.log('    ✅ Message indexes created');

        // User collection indexes (if not exist)
        console.log('  - Creating User indexes...');
        await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
        await db.collection('users').createIndex({ role: 1 });
        console.log('    ✅ User indexes created');

        // List all indexes
        console.log('\n📋 Current indexes:');

        const chatIndexes = await db.collection('chats').indexes();
        console.log('  Chats:', chatIndexes.map(i => i.name).join(', '));

        const messageIndexes = await db.collection('messages').indexes();
        console.log('  Messages:', messageIndexes.map(i => i.name).join(', '));

        console.log('\n🎉 All indexes created successfully!');
        console.log('💡 Your queries should now be much faster.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createIndexes();
