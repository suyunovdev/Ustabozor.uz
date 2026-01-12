const express = require('express');
const router = express.Router();

// Telegram Bot webhook (agar kerak bo'lsa)
router.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log('Telegram Update:', update);

        // Process telegram updates here
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;

            // Handle commands
            if (text === '/start') {
                // Send welcome message with Web App button
                console.log(`User ${chatId} started the bot`);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Telegram webhook error:', error);
        res.sendStatus(500);
    }
});

// Get bot info
router.get('/info', async (req, res) => {
    res.json({
        bot_name: 'IshTop Bot',
        web_app_url: process.env.FRONTEND_URL || 'https://your-app.vercel.app',
        description: 'IshTop - Ishchilar va Mijozlar platformasi'
    });
});

module.exports = router;
