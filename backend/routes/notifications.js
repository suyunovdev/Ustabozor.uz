const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Get notifications
router.get('/', async (req, res) => {
    try {
        const userId = req.query.userId;
        const query = userId ? { userId } : {};
        const notifications = await Notification.find(query).sort({ createdAt: -1 });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark as read
router.put('/:id/read', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );
        if (notification) res.json(notification);
        else res.status(404).json({ message: 'Notification not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (userId) {
            await Notification.updateMany({ userId }, { isRead: true });
            res.json({ message: 'All notifications marked as read' });
        } else {
            res.status(400).json({ message: 'userId is required' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (notification) res.json({ message: 'Notification deleted' });
        else res.status(404).json({ message: 'Notification not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
