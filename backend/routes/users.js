const express = require('express');
const router = express.Router();
const multer = require('multer');
const { usersRef } = require('../models/User');
const { docToObj, queryToArray, withUpdatedAt, FieldValue } = require('../models/firestore');
const { getBucket } = require('../config/db');

// Configure Multer for memory storage (Firebase Storage upload)
const upload = multer({ storage: multer.memoryStorage() });

// Get all users or filter by role
router.get('/', async (req, res) => {
    try {
        const role = req.query.role;
        let query = usersRef();

        if (role) {
            query = query.where('role', '==', role);
        }

        const snapshot = await query.get();
        res.json(queryToArray(snapshot));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const doc = await usersRef().doc(req.params.id).get();
        if (doc.exists) {
            res.json(docToObj(doc));
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.put('/:id', upload.single('avatar'), async (req, res) => {
    try {
        const updatedData = { ...req.body };

        // Convert numeric strings to numbers
        if (updatedData.hourlyRate) updatedData.hourlyRate = Number(updatedData.hourlyRate);
        if (updatedData.balance) updatedData.balance = Number(updatedData.balance);
        if (updatedData.rating) updatedData.rating = Number(updatedData.rating);
        if (updatedData.ratingCount) updatedData.ratingCount = Number(updatedData.ratingCount);

        // Handle location object
        if (updatedData.location) {
            if (typeof updatedData.location === 'string') {
                try { updatedData.location = JSON.parse(updatedData.location); } catch (e) { /* keep as is */ }
            }
            if (updatedData.location.lat) updatedData.location.lat = Number(updatedData.location.lat);
            if (updatedData.location.lng) updatedData.location.lng = Number(updatedData.location.lng);
        }

        // Handle skills array
        if (typeof updatedData.skills === 'string') {
            try {
                updatedData.skills = JSON.parse(updatedData.skills);
            } catch (e) {
                // Keep as is
            }
        }

        // Upload avatar to Firebase Storage
        if (req.file) {
            const bucket = getBucket();
            if (bucket) {
                const fileName = `uploads/avatars/${Date.now()}-${req.file.originalname}`;
                const file = bucket.file(fileName);
                await file.save(req.file.buffer, {
                    metadata: { contentType: req.file.mimetype }
                });
                await file.makePublic();
                updatedData.avatar = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
            }
        }

        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await docRef.update(withUpdatedAt(updatedData));
        const updated = await docRef.get();
        res.json(docToObj(updated));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle online status
router.put('/:id/online', async (req, res) => {
    try {
        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const currentStatus = doc.data().isOnline || false;
        await docRef.update(withUpdatedAt({ isOnline: !currentStatus }));
        const updated = await docRef.get();
        res.json(docToObj(updated));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await docRef.delete();
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Block user
router.post('/:id/block', async (req, res) => {
    try {
        const { blockedUserId } = req.body;
        if (!blockedUserId) {
            return res.status(400).json({ message: 'Blocked User ID is required' });
        }

        const docRef = usersRef().doc(req.params.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        await docRef.update({
            blockedUsers: FieldValue.arrayUnion(blockedUserId),
            updatedAt: FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'User blocked' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
