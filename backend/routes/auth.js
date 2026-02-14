const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { usersRef } = require('../models/User');
const { docToObj, withTimestamps } = require('../models/firestore');

const JWT_SECRET = process.env.JWT_SECRET || 'ishtop-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(`Login attempt: ${email}`);

        const snapshot = await usersRef()
            .where('email', '==', email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ message: 'Email yoki parol noto\'g\'ri' });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // O'chirilgan foydalanuvchi login qila olmaydi
        if (userData.isDeleted) {
            return res.status(403).json({ message: 'Bu hisob o\'chirilgan' });
        }

        // Eski parollar uchun (hashing qo'shilmasdan oldingi) va yangi parollar uchun
        let isValidPassword = false;
        const isHashed = userData.password && (userData.password.startsWith('$2a$') || userData.password.startsWith('$2b$'));

        console.log(`Password check for ${email}: isHashed=${isHashed}, passLength=${userData.password?.length}`);

        if (isHashed) {
            // Hashed parol — bcrypt bilan tekshirish
            isValidPassword = await bcrypt.compare(password, userData.password);
        } else {
            // Eski plaintext parol — tekshirib, hashlab yangilash
            isValidPassword = (userData.password === password);
            if (isValidPassword) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await userDoc.ref.update({ password: hashedPassword });
                console.log(`Password migrated to bcrypt for ${email}`);
            }
        }

        console.log(`Password valid: ${isValidPassword}`);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Email yoki parol noto\'g\'ri' });
        }

        const user = docToObj(userDoc);
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log('Login success');
        res.json({ ...user, token });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server xatosi' });
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

        // Telefon raqam bo'yicha ham tekshirish
        if (req.body.phone) {
            const phoneExists = await usersRef()
                .where('phone', '==', req.body.phone)
                .limit(1)
                .get();

            if (!phoneExists.empty) {
                return res.status(400).json({ message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
            }
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const userData = {
            name: req.body.name || '',
            surname: req.body.surname || '',
            phone: req.body.phone || '',
            email: req.body.email,
            password: hashedPassword,
            role: (req.body.role === 'ADMIN') ? 'CUSTOMER' : (req.body.role || 'CUSTOMER'),
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
        const user = docToObj(newDoc);
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log('Register success');
        res.json({ ...user, token });
    } catch (error) {
        console.error('Register error:', error.message);
        res.status(400).json({ message: 'Server xatosi' });
    }
});

module.exports = router;
