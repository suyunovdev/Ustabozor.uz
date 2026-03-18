const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
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

        const now = new Date().toISOString();
        await userDoc.ref.update({ isOnline: true, lastSeen: now });

        const user = docToObj(userDoc);
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log(`Login success: id=${user.id}, role=${user.role}`);
        res.json({ ...user, isOnline: true, lastSeen: now, token });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ message: 'Server xatosi' });
    }
});

// --- VALIDATSIYA YORDAMCHILARI ---

// Telefon raqamini normallashtirish: +998901234567 formatiga
const normalizePhone = (phone) => {
    if (!phone) return '';
    let p = phone.replace(/[\s\-\(\)]/g, '');
    if (p.startsWith('998')) p = '+' + p;
    if (p.startsWith('8') && p.length === 11) p = '+7' + p.slice(1); // RU format
    if (!p.startsWith('+')) p = '+998' + p;
    return p;
};

// O'zbekiston telefon formati: +998 XX XXXXXXX (12 ta raqam +998 bilan)
const isValidUzPhone = (phone) => /^\+998[0-9]{9}$/.test(phone);

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const isValidName = (name) => /^[a-zA-ZÀ-ÿа-яА-ЯёЁ\u0400-\u04FF\u0100-\u017F'`\- ]{2,50}$/.test(name.trim());

// Register
router.post('/register', async (req, res) => {
    try {
        console.log('Register attempt:', req.body.email);

        const { name, surname, email, password, phone } = req.body;

        // --- INPUT VALIDATSIYA ---
        if (!name || !name.trim()) return res.status(400).json({ message: 'Ism kiritilishi shart' });
        if (!isValidName(name)) return res.status(400).json({ message: 'Ism faqat harflardan iborat bo\'lishi kerak (min 2 ta)' });

        if (!surname || !surname.trim()) return res.status(400).json({ message: 'Familiya kiritilishi shart' });
        if (!isValidName(surname)) return res.status(400).json({ message: 'Familiya faqat harflardan iborat bo\'lishi kerak (min 2 ta)' });

        if (!email || !email.trim()) return res.status(400).json({ message: 'Email kiritilishi shart' });
        if (!isValidEmail(email.trim().toLowerCase())) return res.status(400).json({ message: 'Email formati noto\'g\'ri (masalan: ism@gmail.com)' });

        if (!password) return res.status(400).json({ message: 'Parol kiritilishi shart' });
        if (password.length < 6) return res.status(400).json({ message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak' });

        const normalizedPhone = phone ? normalizePhone(phone) : '';
        if (!normalizedPhone) return res.status(400).json({ message: 'Telefon raqam kiritilishi shart' });
        if (!isValidUzPhone(normalizedPhone)) return res.status(400).json({ message: 'Telefon raqam O\'zbekiston formatida bo\'lishi kerak (+998XXXXXXXXX)' });

        const cleanEmail = email.trim().toLowerCase();

        // --- DUPLIKAT TEKSHIRUV ---
        const existing = await usersRef()
            .where('email', '==', cleanEmail)
            .limit(1)
            .get();

        if (!existing.empty) {
            return res.status(400).json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
        }

        const phoneExists = await usersRef()
            .where('phone', '==', normalizedPhone)
            .limit(1)
            .get();

        if (!phoneExists.empty) {
            return res.status(400).json({ message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const userData = {
            name: name.trim(),
            surname: surname.trim(),
            phone: normalizedPhone,
            email: cleanEmail,
            password: hashedPassword,
            role: (req.body.role === 'ADMIN') ? 'CUSTOMER' : (req.body.role || 'CUSTOMER'),
            avatar: req.body.avatar || '',
            lastSeen: new Date().toISOString(),
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

// Google OAuth — idToken bilan login/register
router.post('/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ message: 'idToken kerak' });
        }

        // Firebase Admin SDK bilan tokenni tekshirish
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture, uid } = decodedToken;

        console.log(`Google auth attempt: ${email}`);

        // Email bo'yicha mavjud foydalanuvchini topish
        const existing = await usersRef()
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existing.empty) {
            const userDoc = existing.docs[0];
            const userData = userDoc.data();

            // O'chirilgan foydalanuvchi
            if (userData.isDeleted) {
                return res.status(403).json({ message: 'Bu hisob o\'chirilgan' });
            }

            // Banned foydalanuvchi
            if (userData.isBanned) {
                return res.status(403).json({ message: 'Bu hisob bloklangan' });
            }

            // Mavjud user — oauthProvider ni yangilash (agar hali yo'q bo'lsa)
            if (!userData.oauthProvider) {
                await userDoc.ref.update({ oauthProvider: 'google' });
            }

            const user = docToObj(userDoc);
            const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

            console.log(`Google login success: ${email}`);
            return res.json({ ...user, token });
        }

        // Yangi user — role tanlash kerak
        console.log(`Google new user, needs role: ${email}`);
        return res.json({
            needsRole: true,
            googleData: {
                email: email,
                name: name || '',
                avatar: picture || '',
                providerId: uid
            }
        });
    } catch (error) {
        console.error('Google auth error:', error.message);
        res.status(401).json({ message: 'Google autentifikatsiya xatosi' });
    }
});

// Google OAuth — role tanlagandan keyin ro'yxatdan o'tish
router.post('/google/complete', async (req, res) => {
    try {
        const { idToken, role, phone } = req.body;
        if (!idToken || !role) {
            return res.status(400).json({ message: 'idToken va role kerak' });
        }

        // Tokenni qayta tekshirish
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { email, name, picture, uid } = decodedToken;

        // Email allaqachon mavjudligini tekshirish
        const existing = await usersRef()
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existing.empty) {
            return res.status(400).json({ message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
        }

        // Telefon tekshirish (agar berilgan bo'lsa)
        if (phone) {
            const phoneExists = await usersRef()
                .where('phone', '==', phone)
                .limit(1)
                .get();

            if (!phoneExists.empty) {
                return res.status(400).json({ message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
            }
        }

        // Ismni bo'lish (Google'dan kelgan to'liq ism)
        const nameParts = (name || '').split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';

        const userData = {
            name: firstName,
            surname: surname,
            phone: phone || '',
            email: email,
            password: null, // Google user — parol yo'q
            oauthProvider: 'google',
            role: (role === 'ADMIN') ? 'CUSTOMER' : (role || 'CUSTOMER'),
            avatar: picture || '',
            balance: 0,
            rating: 5.0,
            ratingCount: 0,
            skills: req.body.skills || [],
            hourlyRate: req.body.hourlyRate || 0,
            completedJobs: 0,
            isOnline: false,
            location: { lat: 0, lng: 0 },
            blockedUsers: []
        };

        const docRef = await usersRef().add(withTimestamps(userData));
        const newDoc = await docRef.get();
        const user = docToObj(newDoc);
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        console.log(`Google register success: ${email} as ${role}`);
        res.json({ ...user, token });
    } catch (error) {
        console.error('Google complete error:', error.message);
        res.status(400).json({ message: 'Google ro\'yxatdan o\'tish xatosi' });
    }
});

module.exports = router;
