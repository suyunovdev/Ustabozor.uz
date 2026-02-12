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

// Bot orqali ro'yxatdan o'tish holati (in-memory)
// Key: telegramId, Value: { step, data }
const registrationState = new Map();

const SKILLS_LIST = ['Santexnika', 'Elektr', 'Tozalash', 'Yuk tashish', 'Qurilish', 'Bo\'yoqchi', 'Bog\'bon', 'Haydovchi'];

// Status nomlarini o'zbekchaga tarjima
const STATUS_UZ = {
    'PENDING': 'Kutilmoqda',
    'ACCEPTED': 'Qabul qilindi',
    'IN_PROGRESS': 'Bajarilmoqda',
    'COMPLETED': 'Tugallandi',
    'CANCELLED': 'Bekor qilindi'
};

// --- BOT REGISTRATION HANDLERS ---

async function handleBotRegistration(chatId, telegramId, firstName, text, message) {
    const state = registrationState.get(telegramId);
    if (!state) return;

    // 1. Ism qadami
    if (state.step === 'name') {
        if (!text || text.trim().length < 2) {
            await sendMessage(chatId, 'Ism kamida 2 ta harf bo\'lishi kerak. Qayta yozing:');
            return;
        }
        state.data.name = text.trim();
        state.step = 'surname';
        registrationState.set(telegramId, state);
        await sendMessage(chatId, 'Familiyangizni yozing:');
        return;
    }

    // 2. Familiya qadami
    if (state.step === 'surname') {
        if (!text || text.trim().length < 2) {
            await sendMessage(chatId, 'Familiya kamida 2 ta harf bo\'lishi kerak. Qayta yozing:');
            return;
        }
        state.data.surname = text.trim();
        state.step = 'email';
        registrationState.set(telegramId, state);
        await sendMessage(chatId, 'Email manzilingizni yozing:\n(Masalan: isming@gmail.com)');
        return;
    }

    // 3. Email qadami
    if (state.step === 'email') {
        const email = text.trim().toLowerCase();
        if (!email.includes('@') || !email.includes('.')) {
            await sendMessage(chatId, 'Email formati noto\'g\'ri. Qayta yozing:\n(Masalan: isming@gmail.com)');
            return;
        }
        // Email bandligini tekshirish
        const emailExists = await usersRef().where('email', '==', email).limit(1).get();
        if (!emailExists.empty) {
            await sendMessage(chatId, 'Bu email allaqachon ro\'yxatdan o\'tgan.\nBoshqa email yozing yoki /cancel bosib, "Mavjud akkauntni ulash" ni tanlang.');
            return;
        }
        state.data.email = email;
        state.step = 'password';
        registrationState.set(telegramId, state);
        await sendMessage(chatId, 'Parol yarating:\n(Kamida 4 ta belgi)');
        return;
    }

    // 4. Parol qadami
    if (state.step === 'password') {
        if (!text || text.trim().length < 4) {
            await sendMessage(chatId, 'Parol kamida 4 ta belgi bo\'lishi kerak. Qayta yozing:');
            return;
        }
        state.data.password = text.trim();
        state.step = 'phone';
        registrationState.set(telegramId, state);
        await sendMessage(chatId,
            'Telefon raqamingizni yuboring:\n(Masalan: +998901234567)\n\nYoki tugmani bosing:',
            {
                keyboard: [[{ text: '📞 Kontakt ulashish', request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        );
        return;
    }

    // 5. Telefon raqami qadami
    if (state.step === 'phone') {
        let phone = '';
        if (message.contact) {
            phone = message.contact.phone_number;
        } else {
            phone = text.replace(/\s/g, '');
            if (!phone.startsWith('+')) phone = '+' + phone;
        }
        if (phone.length < 9) {
            await sendMessage(chatId, 'Telefon raqami noto\'g\'ri. Qayta yuboring:');
            return;
        }
        state.data.phone = phone;

        if (state.data.role === 'WORKER') {
            state.step = 'skills';
            state.data.skills = [];
            registrationState.set(telegramId, state);

            const keyboard = SKILLS_LIST.map(s => [{
                text: `⬜ ${s}`,
                callback_data: `skill_${s}`
            }]);
            keyboard.push([{ text: '✅ Tayyor (0 ta tanlandi)', callback_data: 'skills_done' }]);

            // Remove reply keyboard then show skills
            await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: '<b>Ko\'nikmalaringiz</b>\n\nTanlangan: hali tanlanmagan',
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: keyboard }
                })
            });
            // Remove contact keyboard
            await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: 'Ko\'nikmalarni tanlang:',
                    reply_markup: { remove_keyboard: true }
                })
            });
        } else {
            // Mijoz — yaratish
            await finishBotRegistration(chatId, telegramId, { first_name: state.data.name, id: telegramId }, state.data);
        }
        return;
    }

    // Akkaunt ulash — email qadami
    if (state.step === 'link_email') {
        state.data.email = text.trim();
        state.step = 'link_password';
        registrationState.set(telegramId, state);
        await sendMessage(chatId, 'Parolingizni yuboring:');
        return;
    }

    // Akkaunt ulash — parol qadami
    if (state.step === 'link_password') {
        const email = state.data.email;
        const password = text.trim();

        const snapshot = await usersRef()
            .where('email', '==', email)
            .where('password', '==', password)
            .limit(1)
            .get();

        if (snapshot.empty) {
            registrationState.delete(telegramId);
            await sendMessage(chatId, 'Email yoki parol noto\'g\'ri. Qayta urinish: /start');
            return;
        }

        const docRef = snapshot.docs[0].ref;
        await docRef.update(withUpdatedAt({
            telegramId: telegramId,
            isOnline: true
        }));

        const user = docToObj(await docRef.get());
        registrationState.delete(telegramId);

        const webAppUrl = process.env.FRONTEND_URL || 'https://ustabozor-uz-5wha.vercel.app';
        await sendMessage(chatId,
            `Muvaffaqiyatli ulandi!\n\n` +
            `Ism: <b>${user.name} ${user.surname || ''}</b>\n` +
            `Rol: <b>${user.role === 'WORKER' ? 'Ishchi' : 'Mijoz'}</b>\n\n` +
            `Endi ilovani ochishingiz mumkin:`,
            {
                inline_keyboard: [[{ text: "Ilovani ochish", web_app: { url: webAppUrl } }]]
            }
        );
        return;
    }

    // --- Profil tahrirlash step'lari ---

    // Ism tahrirlash
    if (state.step === 'edit_name') {
        if (!text || text.trim().length < 2) {
            await sendMessage(chatId, 'Ism kamida 2 ta harf bo\'lishi kerak. Qayta yozing:');
            return;
        }
        const userSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();
        if (!userSnap.empty) {
            await userSnap.docs[0].ref.update(withUpdatedAt({ name: text.trim() }));
            registrationState.delete(telegramId);
            await sendMessage(chatId, `Ism yangilandi: <b>${text.trim()}</b>\n\nProfilni ko'rish: /profile`);
        }
        return;
    }

    // Familiya tahrirlash
    if (state.step === 'edit_surname') {
        if (!text || text.trim().length < 2) {
            await sendMessage(chatId, 'Familiya kamida 2 ta harf bo\'lishi kerak. Qayta yozing:');
            return;
        }
        const userSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();
        if (!userSnap.empty) {
            await userSnap.docs[0].ref.update(withUpdatedAt({ surname: text.trim() }));
            registrationState.delete(telegramId);
            await sendMessage(chatId, `Familiya yangilandi: <b>${text.trim()}</b>\n\nProfilni ko'rish: /profile`);
        }
        return;
    }

    // Telefon tahrirlash
    if (state.step === 'edit_phone') {
        let phone = '';
        if (message.contact) {
            phone = message.contact.phone_number;
        } else {
            phone = text.replace(/\s/g, '');
            if (!phone.startsWith('+')) phone = '+' + phone;
        }
        if (phone.length < 9) {
            await sendMessage(chatId, 'Telefon raqami noto\'g\'ri. Qayta yuboring:');
            return;
        }
        const userSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();
        if (!userSnap.empty) {
            await userSnap.docs[0].ref.update(withUpdatedAt({ phone }));
            registrationState.delete(telegramId);
            await sendMessage(chatId, `Telefon yangilandi: <b>${phone}</b>\n\nProfilni ko'rish: /profile`,
                { remove_keyboard: true }
            );
        }
        return;
    }
}

async function finishBotRegistration(chatId, telegramId, from, data) {
    const webAppUrl = process.env.FRONTEND_URL || 'https://ustabozor-uz-5wha.vercel.app';

    // Allaqachon bormi tekshirish
    const existing = await usersRef().where('telegramId', '==', telegramId).limit(1).get();
    if (!existing.empty) {
        registrationState.delete(telegramId);
        await sendMessage(chatId, 'Siz allaqachon ro\'yxatdan o\'tgansiz!', {
            inline_keyboard: [[{ text: "Ilovani ochish", web_app: { url: webAppUrl } }]]
        });
        return;
    }

    const userData = {
        name: data.name || from.first_name || '',
        surname: data.surname || from.last_name || '',
        phone: data.phone || '',
        email: data.email || '',
        password: data.password || '',
        telegramId: telegramId,
        telegramUsername: from.username || '',
        role: data.role || 'CUSTOMER',
        avatar: from.photo_url || '',
        balance: 0,
        rating: 5.0,
        ratingCount: 0,
        skills: data.skills || [],
        hourlyRate: 0,
        completedJobs: 0,
        isOnline: true,
        location: { lat: 0, lng: 0 },
        blockedUsers: []
    };

    const docRef = await usersRef().add(withTimestamps(userData));
    registrationState.delete(telegramId);

    const roleName = data.role === 'WORKER' ? 'Ishchi (Usta)' : 'Mijoz (Ish beruvchi)';
    const displayName = data.name || from.first_name || '';
    let msg = `Tabriklaymiz, <b>${displayName}</b>! 🎉\n\n` +
        `Siz muvaffaqiyatli ro'yxatdan o'tdingiz!\n\n` +
        `Ism: <b>${displayName} ${data.surname || ''}</b>\n` +
        `Email: <b>${data.email || ''}</b>\n` +
        `Rol: <b>${roleName}</b>\n` +
        `Telefon: ${data.phone}`;

    if (data.skills && data.skills.length > 0) {
        msg += `\nKo'nikmalar: ${data.skills.join(', ')}`;
    }

    msg += `\n\nIlovani ochish uchun quyidagi tugmani bosing:`;

    await sendMessage(chatId, msg, {
        inline_keyboard: [[{ text: "Ilovani ochish", web_app: { url: webAppUrl } }]]
    });
}

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

            // Bot orqali ro'yxatdan o'tish — step handler
            const regState = registrationState.get(telegramId);
            if (regState && text !== '/start' && text !== '/cancel') {
                await handleBotRegistration(chatId, telegramId, firstName, text, update.message);
                return res.sendStatus(200);
            }

            if (text === '/start') {
                // Agar allaqachon ro'yxatdan o'tgan bo'lsa
                const existingSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();
                if (!existingSnap.empty) {
                    const user = docToObj(existingSnap.docs[0]);
                    await sendMessage(chatId,
                        `Xush kelibsiz, <b>${user.name}</b>!\n\n` +
                        `Siz allaqachon ro'yxatdan o'tgansiz.\n` +
                        `Rol: <b>${user.role === 'WORKER' ? 'Ishchi (Usta)' : 'Mijoz'}</b>\n\n` +
                        `Ilovani ochish uchun tugmani bosing:`,
                        {
                            inline_keyboard: [
                                [{ text: "Ilovani ochish", web_app: { url: webAppUrl } }],
                                [{ text: "Buyurtmalarim", callback_data: 'my_orders' }, { text: "Profilim", callback_data: 'profile' }]
                            ]
                        }
                    );
                } else {
                    // Yangi foydalanuvchi — tanlov berish
                    registrationState.delete(telegramId);
                    await sendMessage(chatId,
                        `Assalomu alaykum, <b>${firstName}</b>!\n\n` +
                        `<b>IshTop</b> - Ishchilar va Mijozlar platformasiga xush kelibsiz.\n\n` +
                        `Ro'yxatdan o'tish usulini tanlang:`,
                        {
                            inline_keyboard: [
                                [{ text: "📱 Mini App orqali", web_app: { url: webAppUrl } }],
                                [{ text: "🤖 Bot orqali ro'yxatdan o'tish", callback_data: 'register_bot' }],
                                [{ text: "🔗 Mavjud akkauntni ulash", callback_data: 'link_account' }]
                            ]
                        }
                    );
                }

            } else if (text === '/cancel') {
                registrationState.delete(telegramId);
                await sendMessage(chatId, 'Ro\'yxatdan o\'tish bekor qilindi. Qayta boshlash: /start');

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
                    let profileMsg = `<b>Profilingiz</b>\n\n` +
                        `Ism: ${user.name} ${user.surname || ''}\n` +
                        `Rol: ${user.role === 'WORKER' ? 'Ishchi (Usta)' : 'Mijoz'}\n` +
                        `Reyting: ${user.rating || 5.0}/5\n` +
                        `Balans: ${(user.balance || 0).toLocaleString()} so'm\n` +
                        `Telefon: ${user.phone || 'Ko\'rsatilmagan'}`;

                    if (user.role === 'WORKER' && user.skills && user.skills.length > 0) {
                        profileMsg += `\nKo'nikmalar: ${user.skills.join(', ')}`;
                    }

                    const editButtons = [
                        [{ text: "✏️ Ism", callback_data: 'edit_name' }, { text: "✏️ Familiya", callback_data: 'edit_surname' }],
                        [{ text: "📞 Telefon", callback_data: 'edit_phone' }]
                    ];
                    if (user.role === 'WORKER') {
                        editButtons.push([{ text: "🔧 Ko'nikmalar", callback_data: 'edit_skills' }]);
                    }
                    editButtons.push([{ text: "📱 Ilovada to'liq tahrirlash", web_app: { url: webAppUrl } }]);

                    await sendMessage(chatId, profileMsg, { inline_keyboard: editButtons });
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

            const telegramId = update.callback_query.from?.id;

            if (data === 'help') {
                await sendMessage(chatId, `<b>Yordam</b>\n\n/start - Botni boshlash\n/help - Yordam\n/orders - Buyurtmalarim\n/profile - Profilim`);
            } else if (data === 'my_orders') {
                await sendMessage(chatId, 'Buyurtmalaringizni ko\'rish uchun /orders buyrug\'ini yuboring.');
            } else if (data === 'profile') {
                await sendMessage(chatId, 'Profilingizni ko\'rish uchun /profile buyrug\'ini yuboring.');

            // --- Bot orqali ro'yxatdan o'tish ---
            } else if (data === 'register_bot') {
                registrationState.set(telegramId, { step: 'role', data: {} });
                await sendMessage(chatId,
                    `<b>Ro'yxatdan o'tish</b>\n\nRolingizni tanlang:`,
                    {
                        inline_keyboard: [
                            [{ text: "👤 Mijoz (Ish beruvchi)", callback_data: 'role_CUSTOMER' }],
                            [{ text: "🔧 Ishchi (Usta)", callback_data: 'role_WORKER' }]
                        ]
                    }
                );

            } else if (data === 'role_CUSTOMER' || data === 'role_WORKER') {
                const role = data.replace('role_', '');
                registrationState.set(telegramId, {
                    step: 'name',
                    data: { role }
                });
                await sendMessage(chatId,
                    `Rol: <b>${role === 'WORKER' ? 'Ishchi' : 'Mijoz'}</b>\n\n` +
                    `Ismingizni yozing:`,
                    { remove_keyboard: true }
                );

            // Skills tanlash (WORKER uchun)
            } else if (data.startsWith('skill_')) {
                const state = registrationState.get(telegramId);
                if (!state || state.step !== 'skills') return;

                const skill = data.replace('skill_', '');
                if (!state.data.skills) state.data.skills = [];

                if (state.data.skills.includes(skill)) {
                    state.data.skills = state.data.skills.filter(s => s !== skill);
                } else {
                    state.data.skills.push(skill);
                }
                registrationState.set(telegramId, state);

                // Refresh skills keyboard
                const keyboard = SKILLS_LIST.map(s => [{
                    text: `${state.data.skills.includes(s) ? '✅' : '⬜'} ${s}`,
                    callback_data: `skill_${s}`
                }]);
                keyboard.push([{ text: `✅ Tayyor (${state.data.skills.length} ta tanlandi)`, callback_data: 'skills_done' }]);

                // Edit existing message
                const msgId = update.callback_query.message?.message_id;
                await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        message_id: msgId,
                        text: `<b>Ko'nikmalaringiz</b>\n\nTanlangan: ${state.data.skills.length > 0 ? state.data.skills.join(', ') : 'hali tanlanmagan'}`,
                        parse_mode: 'HTML',
                        reply_markup: { inline_keyboard: keyboard }
                    })
                });

            } else if (data === 'skills_done') {
                const state = registrationState.get(telegramId);
                if (!state) return;

                if (!state.data.skills || state.data.skills.length === 0) {
                    await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ callback_query_id: callbackId, text: 'Kamida 1 ta ko\'nikma tanlang!', show_alert: true })
                    });
                    return;
                }

                // Foydalanuvchini yaratish
                await finishBotRegistration(chatId, telegramId, update.callback_query.from, state.data);

            } else if (data === 'link_account') {
                registrationState.set(telegramId, { step: 'link_email', data: {} });
                await sendMessage(chatId,
                    `<b>Akkauntni ulash</b>\n\n` +
                    `Ro'yxatdan o'tgan email manzilingizni yuboring:\n\n` +
                    `Bekor qilish: /cancel`,
                    { remove_keyboard: true }
                );

            // --- Profil tahrirlash ---
            } else if (data === 'edit_name') {
                registrationState.set(telegramId, { step: 'edit_name', data: {} });
                await sendMessage(chatId, 'Yangi ismingizni yozing:\n\nBekor qilish: /cancel');

            } else if (data === 'edit_surname') {
                registrationState.set(telegramId, { step: 'edit_surname', data: {} });
                await sendMessage(chatId, 'Yangi familiyangizni yozing:\n\nBekor qilish: /cancel');

            } else if (data === 'edit_phone') {
                registrationState.set(telegramId, { step: 'edit_phone', data: {} });
                await sendMessage(chatId,
                    'Yangi telefon raqamingizni yuboring:\n(Masalan: +998901234567)\n\nBekor qilish: /cancel',
                    {
                        keyboard: [[{ text: '📞 Kontakt ulashish', request_contact: true }]],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                );

            } else if (data === 'edit_skills') {
                // Hozirgi ko'nikmalarni olish
                const userSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();
                const currentSkills = userSnap.empty ? [] : (docToObj(userSnap.docs[0]).skills || []);

                registrationState.set(telegramId, { step: 'edit_skills', data: { skills: [...currentSkills] } });

                const keyboard = SKILLS_LIST.map(s => [{
                    text: `${currentSkills.includes(s) ? '✅' : '⬜'} ${s}`,
                    callback_data: `editskill_${s}`
                }]);
                keyboard.push([{ text: `✅ Saqlash (${currentSkills.length} ta)`, callback_data: 'editskills_done' }]);

                await sendMessage(chatId,
                    `<b>Ko'nikmalarni tahrirlash</b>\n\nTanlangan: ${currentSkills.length > 0 ? currentSkills.join(', ') : 'hali tanlanmagan'}`,
                    { inline_keyboard: keyboard }
                );

            } else if (data.startsWith('editskill_')) {
                const state = registrationState.get(telegramId);
                if (!state || state.step !== 'edit_skills') return;

                const skill = data.replace('editskill_', '');
                if (!state.data.skills) state.data.skills = [];

                if (state.data.skills.includes(skill)) {
                    state.data.skills = state.data.skills.filter(s => s !== skill);
                } else {
                    state.data.skills.push(skill);
                }
                registrationState.set(telegramId, state);

                const keyboard = SKILLS_LIST.map(s => [{
                    text: `${state.data.skills.includes(s) ? '✅' : '⬜'} ${s}`,
                    callback_data: `editskill_${s}`
                }]);
                keyboard.push([{ text: `✅ Saqlash (${state.data.skills.length} ta)`, callback_data: 'editskills_done' }]);

                const msgId = update.callback_query.message?.message_id;
                await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        message_id: msgId,
                        text: `<b>Ko'nikmalarni tahrirlash</b>\n\nTanlangan: ${state.data.skills.length > 0 ? state.data.skills.join(', ') : 'hali tanlanmagan'}`,
                        parse_mode: 'HTML',
                        reply_markup: { inline_keyboard: keyboard }
                    })
                });

            } else if (data === 'editskills_done') {
                const state = registrationState.get(telegramId);
                if (!state || state.step !== 'edit_skills') return;

                const userSnap = await usersRef().where('telegramId', '==', telegramId).limit(1).get();
                if (!userSnap.empty) {
                    await userSnap.docs[0].ref.update(withUpdatedAt({ skills: state.data.skills || [] }));
                    registrationState.delete(telegramId);
                    await sendMessage(chatId,
                        `Ko'nikmalar yangilandi: <b>${(state.data.skills || []).join(', ') || 'Bo\'sh'}</b>\n\nProfilni ko'rish: /profile`
                    );
                } else {
                    registrationState.delete(telegramId);
                    await sendMessage(chatId, 'Xatolik. Qayta urinib ko\'ring: /profile');
                }
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
