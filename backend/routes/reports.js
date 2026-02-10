const express = require('express');
const router = express.Router();
const { reportsRef } = require('../models/Report');
const { docToObj, withTimestamps } = require('../models/firestore');

// Create a report
router.post('/', async (req, res) => {
    try {
        const { reporterId, reportedUserId, reason, description } = req.body;

        if (!reporterId || !reportedUserId || !reason) {
            return res.status(400).json({ message: 'Reporter ID, Reported User ID, and Reason are required' });
        }

        const docRef = await reportsRef().add(withTimestamps({
            reporterId,
            reportedUserId,
            reason,
            description: description || '',
            status: 'PENDING'
        }));

        const newDoc = await docRef.get();
        res.status(201).json(docToObj(newDoc));
    } catch (error) {
        console.error('Report POST error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
