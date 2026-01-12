const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
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

// Get chats for a user - OPTIMIZED WITH CACHE
router.get('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.json([]);
        }

        // Check cache first
        const cacheKey = `chats:${userId}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log(`⚡ Chats served from cache in ${Date.now() - startTime}ms`);
            return res.json(cachedData);
        }

        // Convert userId to ObjectId for proper matching
        const userObjectId = toObjectId(userId);

        // Use aggregation pipeline for maximum performance
        const chats = await Chat.aggregate([
            { $match: { participants: userObjectId } },
            { $sort: { updatedAt: -1 } },
            { $limit: 50 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants',
                    foreignField: '_id',
                    as: 'participantDetails',
                    pipeline: [
                        { $project: { name: 1, surname: 1, avatar: 1, role: 1, isOnline: 1 } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    localField: 'lastMessage',
                    foreignField: '_id',
                    as: 'lastMessageDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    participants: '$participantDetails',
                    lastMessage: { $arrayElemAt: ['$lastMessageDetails', 0] },
                    unreadCounts: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);

        // Process results
        const chatsWithUnread = chats.map(chat => {
            let unreadCount = 0;
            if (chat.unreadCounts && chat.unreadCounts[userId]) {
                unreadCount = chat.unreadCounts[userId];
            }
            return {
                ...chat,
                unreadCount,
                unreadCounts: undefined
            };
        });

        // Cache for 3 seconds
        cache.set(cacheKey, chatsWithUnread, 3000);

        console.log(`⚡ Chats loaded from DB in ${Date.now() - startTime}ms for user ${userId}`);
        res.json(chatsWithUnread);
    } catch (error) {
        console.error('Chat GET error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create or get chat between two users
router.post('/', async (req, res) => {
    const startTime = Date.now();
    try {
        const { participantIds } = req.body;

        console.log('📨 Creating/getting chat for participants:', participantIds);

        if (!participantIds || participantIds.length < 2) {
            return res.status(400).json({ message: 'At least 2 participant IDs required' });
        }

        // Convert to ObjectIds
        const objectIds = participantIds.map(id => toObjectId(id));

        // Try to find existing chat with these participants
        let chat = await Chat.findOne({
            participants: { $all: objectIds, $size: objectIds.length }
        });

        if (!chat) {
            // Create new chat
            console.log('📝 Creating new chat...');
            const unreadCounts = new Map();
            participantIds.forEach(id => unreadCounts.set(id.toString(), 0));

            chat = new Chat({
                participants: objectIds,
                unreadCounts: unreadCounts
            });
            await chat.save();
            console.log('✅ New chat created:', chat._id);
        } else {
            console.log('✅ Existing chat found:', chat._id);
        }

        // Get participant details
        const User = require('../models/User');
        const participants = await User.find(
            { _id: { $in: objectIds } },
            'name surname avatar role isOnline'
        ).lean();

        // Invalidate cache for all participants
        participantIds.forEach(id => cache.delete(`chats:${id}`));

        const result = {
            _id: chat._id,
            id: chat._id.toString(),
            participants,
            unreadCount: 0,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt
        };

        console.log(`⚡ Chat ready in ${Date.now() - startTime}ms`);
        res.json(result);
    } catch (error) {
        console.error('Chat POST error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Mark chat as read
router.put('/:chatId/read', async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const updateKey = `unreadCounts.${userId}`;
        await Chat.findByIdAndUpdate(chatId, {
            $set: { [updateKey]: 0 }
        });

        // Update messages in background
        Message.updateMany(
            { chatId: toObjectId(chatId), senderId: { $ne: toObjectId(userId) }, status: { $ne: 'READ' } },
            { $set: { status: 'READ' } }
        ).exec();

        // Invalidate cache
        cache.delete(`chats:${userId}`);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get unread count
router.get('/unread/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userObjectId = toObjectId(userId);

        const result = await Chat.aggregate([
            { $match: { participants: userObjectId } },
            {
                $group: {
                    _id: null,
                    totalUnread: {
                        $sum: { $ifNull: [`$unreadCounts.${userId}`, 0] }
                    }
                }
            }
        ]);

        res.json({ unreadCount: result[0]?.totalUnread || 0 });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
