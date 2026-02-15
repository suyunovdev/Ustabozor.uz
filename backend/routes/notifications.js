const express = require('express');
const router = express.Router();
const { notificationsRef } = require('../models/Notification');
const { docToObj, queryToArray, withUpdatedAt, FieldValue } = require('../models/firestore');
const { getDb } = require('../config/db');
const cache = require('../utils/cache');

const NOTIF_CACHE_TTL = 30000; // 30 sekund
const NOTIF_NAMESPACE = 'notifications';

const invalidateNotifCache = (userId) => {
    if (userId) {
        cache.delete(`notif:${userId}`);
    } else {
        cache.deleteNamespace(NOTIF_NAMESPACE);
    }
};

// Get notifications
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId;

        if (userId) {
            const cacheKey = `notif:${userId}`;
            const cached = cache.get(cacheKey);
            if (cached) return res.json(cached);

            const snapshot = await notificationsRef()
                .where('userId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            const result = queryToArray(snapshot);
            cache.set(cacheKey, result, { ttl: NOTIF_CACHE_TTL, namespace: NOTIF_NAMESPACE });
            return res.json(result);
        }

        const snapshot = await notificationsRef().orderBy('createdAt', 'desc').get();
        res.json(queryToArray(snapshot));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark as read
router.put('/:id/read', async (req, res) => {
    try {
        const docRef = notificationsRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await docRef.update(withUpdatedAt({ isRead: true }));
        const updated = await docRef.get();
        const data = docToObj(updated);
        invalidateNotifCache(data.userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const snapshot = await notificationsRef()
            .where('userId', '==', userId)
            .where('isRead', '==', false)
            .get();

        if (!snapshot.empty) {
            const batch = getDb().batch();
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { isRead: true, updatedAt: FieldValue.serverTimestamp() });
            });
            await batch.commit();
        }

        invalidateNotifCache(userId);
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const docRef = notificationsRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const data = doc.data();
        await docRef.delete();
        invalidateNotifCache(data.userId);
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
