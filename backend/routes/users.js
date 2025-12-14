const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const User = require('../models/User');

// Configure Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Get all users or filter by role
router.get('/', async (req, res) => {
    try {
        const role = req.query.role;
        const query = role ? { role } : {};
        const users = await User.find(query);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) res.json(user);
        else res.status(404).json({ message: 'User not found' });
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

        // Handle skills array
        if (typeof updatedData.skills === 'string') {
            try {
                updatedData.skills = JSON.parse(updatedData.skills);
            } catch (e) {
                // Keep as is
            }
        }

        if (req.file) {
            updatedData.avatar = `http://localhost:5000/uploads/${req.file.filename}`;
        }

        const user = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true });
        if (user) res.json(user);
        else res.status(404).json({ message: 'User not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle online status
router.put('/:id/online', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (user) {
            user.isOnline = !user.isOnline;
            await user.save();
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
