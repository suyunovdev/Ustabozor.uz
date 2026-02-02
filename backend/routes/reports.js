const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// Create a report
router.post('/', async (req, res) => {
    try {
        const { reporterId, reportedUserId, reason, description } = req.body;

        if (!reporterId || !reportedUserId || !reason) {
            return res.status(400).json({ message: 'Reporter ID, Reported User ID, and Reason are required' });
        }

        const report = new Report({
            reporterId,
            reportedUserId,
            reason,
            description
        });

        await report.save();
        res.status(201).json(report);
    } catch (error) {
        console.error('Report POST error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
