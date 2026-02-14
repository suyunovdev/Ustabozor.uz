const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'ishtop-secret-key-2026';

// JWT tokenni tekshirish — ixtiyoriy (token bo'lmasa ham o'tkazadi)
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            // Token noto'g'ri — davom etamiz
        }
    }
    next();
}

// JWT tokenni tekshirish — majburiy
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Avtorizatsiya talab qilinadi' });
    }
    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token yaroqsiz yoki muddati tugagan' });
    }
}

// Faqat admin uchun
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Faqat admin uchun' });
    }
    next();
}

module.exports = { optionalAuth, requireAuth, requireAdmin };
