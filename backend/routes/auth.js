const express = require('express');
const router = express.Router();
const { usersRef } = require('../models/User');
const { docToObj, withTimestamps } = require('../models/firestore');

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt: ${email}`);

        const snapshot = await usersRef()
            .where('email', '==', email)
            .where('password', '==', password)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const user = docToObj(snapshot.docs[0]);
            console.log('Login success');
            res.json(user);
        } else {
            res.status(401).json({ message: 'Email yoki parol noto\'g\'ri' });
        }
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// Register
router.post('/register', async (req, res) => {
    try {
        console.log('Register attempt:', req.body.email);

        const existing = await usersRef()
            .where('email', '==', req.body.email)
            .limit(1)
            .get();

        if (!existing.empty) {
            return res.status(400).json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
        }

        const userData = {
            name: req.body.name || '',
            surname: req.body.surname || '',
            phone: req.body.phone || '',
            email: req.body.email,
            password: req.body.password,
            role: req.body.role || 'CUSTOMER',
            avatar: req.body.avatar || '',
            balance: 0,
            rating: 5.0,
            ratingCount: 0,
            skills: req.body.skills || [],
            hourlyRate: req.body.hourlyRate || 0,
            completedJobs: 0,
            isOnline: false,
            location: req.body.location || { lat: 0, lng: 0 },
            blockedUsers: []
        };

        const docRef = await usersRef().add(withTimestamps(userData));
        const newDoc = await docRef.get();
        console.log('Register success');
        res.json(docToObj(newDoc));
    } catch (error) {
        console.error('Register error:', error.message);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
