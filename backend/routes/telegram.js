const express = require('express');
const router = express.Router();

// Telegram Bot Token (from .env)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Send message helper
async function sendMessage(chatId, text, keyboard = null) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn('TELEGRAM_BOT_TOKEN is missing in .env');
        return;
    }

    try {
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        };

        if (keyboard) {
            body.reply_markup = keyboard;
        }

        await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.error('Error sending Telegram message:', error);
    }
}

// Telegram Bot webhook
router.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        // console.log('Telegram Update:', update);

        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const firstName = update.message.from?.first_name || 'Foydalanuvchi';

            // Handle /start command
            if (text === '/start') {
                const webAppUrl = process.env.FRONTEND_URL || 'https://google.com'; // Fallback

                await sendMessage(chatId, `Assalomu alaykum, <b>${firstName}</b>!\n\nIshTop platformasiga xush kelibsiz. Ishchilar topish yoki ish qidirish uchun quyidagi tugmani bosing.`, {
                    inline_keyboard: [[
                        { text: "🚀 Ilovani ochish", web_app: { url: webAppUrl } }
                    ]]
                });

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
        web_app_url: process.env.FRONTEND_URL,
        description: 'IshTop - Ishchilar va Mijozlar platformasi'
    });
});

module.exports = router;
