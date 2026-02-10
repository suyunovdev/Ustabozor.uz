require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeFirebase } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Firebase
initializeFirebase();

// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));
app.use(bodyParser.json());

// --- ROUTES ---
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const ordersRoutes = require('./routes/orders');
const chatsRoutes = require('./routes/chats');
const messagesRoutes = require('./routes/messages');
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/chats', chatsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', require('./routes/reports'));
app.use('/api/upload', require('./routes/upload'));

// Telegram Bot route
const telegramRoutes = require('./routes/telegram');
app.use('/api/telegram', telegramRoutes);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
