const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { usersRef } = require('../models/User');
const { ordersRef } = require('../models/Order');
const { docToObj, queryToArray, withTimestamps, withUpdatedAt } = require('../models/firestore');

// Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- HELPERS ---

// Send message to Telegram user
async function sendMessage(chatId, text, keyboard = null) {
    if (!TELEGRAM_BOT_TOKEN) return;
    try {
        const body = { chat_id: chatId, text, parse_mode: 'HTML' };
        if (keyboard) body.reply_markup = keyboard;
        await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.error('Telegram sendMessage error:', error);
    }
}

// Validate Telegram WebApp initData (HMAC-SHA-256)
function validateInitData(initData, botToken) {
    try {
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        if (!hash) return null;

        params.delete('hash');

        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) return null;

        // auth_date tekshiruvi (1 soat)
        const authDate = parseInt(params.get('auth_date') || '0');
        if (Math.floor(Date.now() / 1000) - authDate > 3600) return null;

        const userParam = params.get('user');
        return userParam ? JSON.parse(userParam) : null;
    } catch {
        return null;
    }
}

// Status nomlarini o'zbekchaga tarjima
const STATUS_UZ = {
    'PENDING': 'Kutilmoqda',
    'ACCEPTED': 'Qabul qilindi',
    'IN_PROGRESS': 'Bajarilmoqda',
    'COMPLETED': 'Tugallandi',
    'CANCELLED': 'Bekor qilindi'
};

// --- WEBHOOK ---

router.post('/webhook', async (req, res) => {
    try {
        const update = req.body;

        // Regular messages
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const firstName = update.message.from?.first_name || 'Foydalanuvchi';
            const telegramId = update.message.from?.id;
            const webAppUrl = process.env.FRONTEND_URL || 'https://ustabozor-uz-5wha.vercel.app';

            if (text === '/start') {
                await sendMessage(chatId,
                    `Assalomu alaykum, <b>${firstName}</b>!\n\n` +
                    `<b>IshTop</b> - Ishchilar va Mijozlar platformasiga xush kelibsiz.\n\n` +
                    `Bu yerda siz:\n` +
                    `- Usta/Ishchi topishingiz mumkin\n` +
                    `- Ish qidirishingiz mumkin\n` +
                    `- Buyurtma berishingiz mumkin\n\n` +
                    `Boshlash uchun quyidagi tugmani bosing:`,
                    {
                        inline_keyboard: [
                            [{ text: "Ilovani ochish", web_app: { url: webAppUrl } }],
                            [{ text: "Yordam", callback_data: 'help' }, { text: "Buyurtmalarim", callback_data: 'my_orders' }]
                        ]
                    }
                );

            } else if (text === '/help') {
                await sendMessage(chatId,
                    `<b>Yordam</b>\n\n` +
                    `/start - Botni boshlash\n` +
                    `/help - Yordam\n` +
                    `/orders - Buyurtmalarim\n` +
                    `/profile - Profilim\n\n` +
                    `Savollar uchun: @ishtop_support`
                );

            } else if (text === '/orders') {
                const userSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();

                if (userSnap.empty) {
                    await sendMessage(chatId, `Siz hali ro'yxatdan o'tmagansiz. Avval ilovaga kiring:`, {
                        inline_keyboard: [[{ text: "Ro'yxatdan o'tish", web_app: { url: webAppUrl } }]]
                    });
                } else {
                    const user = docToObj(userSnap.docs[0]);
                    const field = user.role === 'WORKER' ? 'workerId' : 'customerId';
                    const ordersSnap = await ordersRef().where(field, '==', user._id).orderBy('createdAt', 'desc').limit(5).get();
                    const orders = queryToArray(ordersSnap);

                    if (orders.length === 0) {
                        await sendMessage(chatId, 'Sizda hali buyurtmalar yo\'q.');
                    } else {
                        let msg = `<b>Oxirgi ${orders.length} ta buyurtma:</b>\n\n`;
                        orders.forEach((o, i) => {
                            msg += `${i + 1}. <b>${o.title}</b>\n   ${STATUS_UZ[o.status] || o.status} | ${(o.price || 0).toLocaleString()} so'm\n\n`;
                        });
                        await sendMessage(chatId, msg);
                    }
                }

            } else if (text === '/profile') {
                const userSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();

                if (userSnap.empty) {
                    await sendMessage(chatId, `Siz hali ro'yxatdan o'tmagansiz.`, {
                        inline_keyboard: [[{ text: "Ro'yxatdan o'tish", web_app: { url: webAppUrl } }]]
                    });
                } else {
                    const user = docToObj(userSnap.docs[0]);
                    await sendMessage(chatId,
                        `<b>Profilingiz</b>\n\n` +
                        `Ism: ${user.name} ${user.surname || ''}\n` +
                        `Rol: ${user.role === 'WORKER' ? 'Ishchi (Usta)' : 'Mijoz'}\n` +
                        `Reyting: ${user.rating || 5.0}/5\n` +
                        `Balans: ${(user.balance || 0).toLocaleString()} so'm\n` +
                        `Telefon: ${user.phone || 'Ko\'rsatilmagan'}`
                    );
                }
            }
        }

        // Callback query (inline button presses)
        if (update.callback_query) {
            const callbackId = update.callback_query.id;
            const data = update.callback_query.data;
            const chatId = update.callback_query.message?.chat.id;

            await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: callbackId })
            });

            if (data === 'help') {
                await sendMessage(chatId, `<b>Yordam</b>\n\n/start - Botni boshlash\n/help - Yordam\n/orders - Buyurtmalarim\n/profile - Profilim`);
            } else if (data === 'my_orders') {
                await sendMessage(chatId, 'Buyurtmalaringizni ko\'rish uchun /orders buyrug\'ini yuboring.');
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('Telegram webhook error:', error);
        res.sendStatus(200); // Doim 200 qaytarish (retry oldini olish)
    }
});

// --- TELEGRAM AUTH ---

// Telegram orqali auto-login
router.post('/auth', async (req, res) => {
    try {
        const { initData } = req.body;
        if (!initData || !TELEGRAM_BOT_TOKEN) {
            return res.status(400).json({ error: 'initData kerak' });
        }

        const telegramUser = validateInitData(initData, TELEGRAM_BOT_TOKEN);
        if (!telegramUser) {
            return res.status(401).json({ error: 'initData tekshiruvdan o\'tmadi' });
        }

        // telegramId bo'yicha foydalanuvchi qidirish
        const snapshot = await usersRef().where('telegramId', '==', telegramUser.id).limit(1).get();

        if (!snapshot.empty) {
            const user = docToObj(snapshot.docs[0]);
            await snapshot.docs[0].ref.update(withUpdatedAt({ isOnline: true }));
            return res.json({ success: true, user: { ...user, isOnline: true }, isNewUser: false });
        }

        // Foydalanuvchi topilmadi - ro'yxatdan o'tish kerak
        return res.json({
            success: true,
            isNewUser: true,
            telegramUser: {
                telegramId: telegramUser.id,
                firstName: telegramUser.first_name,
                lastName: telegramUser.last_name || '',
                username: telegramUser.username || '',
                photoUrl: telegramUser.photo_url || ''
            }
        });
    } catch (error) {
        console.error('Telegram auth error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Telegram orqali ro'yxatdan o'tish
router.post('/register', async (req, res) => {
    try {
        const { initData, role, phone, skills, hourlyRate } = req.body;
        if (!initData || !TELEGRAM_BOT_TOKEN) {
            return res.status(400).json({ error: 'initData kerak' });
        }

        const telegramUser = validateInitData(initData, TELEGRAM_BOT_TOKEN);
        if (!telegramUser) {
            return res.status(401).json({ error: 'initData tekshiruvdan o\'tmadi' });
        }

        // Allaqachon ro'yxatdan o'tganmi tekshirish
        const existing = await usersRef().where('telegramId', '==', telegramUser.id).limit(1).get();
        if (!existing.empty) {
            return res.json({ success: true, user: docToObj(existing.docs[0]), isNewUser: false });
        }

        // Yangi foydalanuvchi yaratish
        const userData = {
            name: telegramUser.first_name || '',
            surname: telegramUser.last_name || '',
            phone: phone || '',
            email: '',
            password: '',
            telegramId: telegramUser.id,
            telegramUsername: telegramUser.username || '',
            role: (role === 'WORKER' || role === 'CUSTOMER') ? role : 'CUSTOMER',
            avatar: telegramUser.photo_url || '',
            balance: 0,
            rating: 5.0,
            ratingCount: 0,
            skills: skills || [],
            hourlyRate: Number(hourlyRate) || 0,
            completedJobs: 0,
            isOnline: true,
            location: { lat: 0, lng: 0 },
            blockedUsers: []
        };

        const docRef = await usersRef().add(withTimestamps(userData));
        const newDoc = await docRef.get();
        const user = docToObj(newDoc);

        // Tabrik xabari yuborish
        try {
            await sendMessage(telegramUser.id,
                `Tabriklaymiz, <b>${telegramUser.first_name}</b>!\n\n` +
                `Siz IshTop platformasiga muvaffaqiyatli ro'yxatdan o'tdingiz.\n` +
                `Rolingiz: <b>${role === 'WORKER' ? 'Ishchi (Usta)' : 'Mijoz (Ish beruvchi)'}</b>`
            );
        } catch (e) { /* ignore */ }

        res.json({ success: true, user, isNewUser: true });
    } catch (error) {
        console.error('Telegram register error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mavjud akkauntni Telegram'ga ulash
router.post('/link', async (req, res) => {
    try {
        const { initData, email, password } = req.body;
        if (!initData || !TELEGRAM_BOT_TOKEN) {
            return res.status(400).json({ error: 'initData kerak' });
        }

        const telegramUser = validateInitData(initData, TELEGRAM_BOT_TOKEN);
        if (!telegramUser) {
            return res.status(401).json({ error: 'initData tekshiruvdan o\'tmadi' });
        }

        const snapshot = await usersRef()
            .where('email', '==', email)
            .where('password', '==', password)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ error: 'Email yoki parol noto\'g\'ri' });
        }

        const docRef = snapshot.docs[0].ref;
        await docRef.update(withUpdatedAt({
            telegramId: telegramUser.id,
            telegramUsername: telegramUser.username || '',
            isOnline: true
        }));

        const updated = await docRef.get();
        res.json({ success: true, user: docToObj(updated) });
    } catch (error) {
        console.error('Telegram link error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- SETUP ENDPOINTS (bir martalik) ---

// Webhook URL ni ro'yxatdan o'tkazish
router.get('/setup-webhook', async (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: 'Token yo\'q' });
    try {
        const webhookUrl = `https://ustabozor-uz.onrender.com/api/telegram/webhook`;
        const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true })
        });
        const data = await response.json();
        res.json({ success: true, webhook_url: webhookUrl, telegram_response: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bot komandalarini ro'yxatdan o'tkazish
router.get('/setup-commands', async (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: 'Token yo\'q' });
    try {
        const commands = [
            { command: 'start', description: 'Botni boshlash' },
            { command: 'help', description: 'Yordam' },
            { command: 'orders', description: 'Buyurtmalarim' },
            { command: 'profile', description: 'Profilim' }
        ];
        const response = await fetch(`${TELEGRAM_API_URL}/setMyCommands`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commands })
        });
        const data = await response.json();
        res.json({ success: true, telegram_response: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mini App menu tugmasini sozlash
router.get('/setup-menu-button', async (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: 'Token yo\'q' });
    try {
        const frontendUrl = process.env.FRONTEND_URL || 'https://ustabozor-uz-5wha.vercel.app';
        const response = await fetch(`${TELEGRAM_API_URL}/setChatMenuButton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                menu_button: { type: 'web_app', text: 'Ilovani ochish', web_app: { url: frontendUrl } }
            })
        });
        const data = await response.json();
        res.json({ success: true, telegram_response: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Webhook info
router.get('/webhook-info', async (req, res) => {
    if (!TELEGRAM_BOT_TOKEN) return res.status(500).json({ error: 'Token yo\'q' });
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bot info
router.get('/info', async (req, res) => {
    res.json({
        bot_name: 'IshTop Bot',
        web_app_url: process.env.FRONTEND_URL,
        description: 'IshTop - Ishchilar va Mijozlar platformasi'
    });
});

// Export sendMessage for other routes (e.g. order notifications)
router.sendTelegramMessage = sendMessage;

module.exports = router;
