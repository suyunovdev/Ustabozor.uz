const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`🔐 Login attempt: ${email}`);
        const user = await User.findOne({ email, password });
        if (user) {
            console.log('✅ Login success');
            res.json(user);
        } else {
            res.status(401).json({ message: 'Email yoki parol noto\'g\'ri' });
        }
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        console.log('📝 Register attempt:', req.body.email);
        const user = new User(req.body);
        await user.save();
        console.log('✅ Register success');
        res.json(user);
    } catch (error) {
        console.error('❌ Register error:', error.message);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
