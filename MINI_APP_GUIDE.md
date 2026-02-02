# Telegram Mini App bo'lib ishga tushirish bo'yicha qo'llanma

Telegram Mini App **HTTPS** protokolini talab qiladi. Localhost (kompyuteringiz) to'g'ridan-to'g'ri ishlamaydi.
Shuning uchun biz **localtunnel** dan foydalanib, vaqtincha internetga chiqaramiz.

## 1-qadam: Bot yaratish (Agar yo'q bo'lsa)
1. Telegramda [@BotFather](https://t.me/BotFather) ni oching.
2. `/newbot` buyrug'ini yuboring.
3. Botga ism bering (masalan: `IshTop App`).
4. Botga username bering (oxiri `bot` bilan tugashi kerak, masalan: `ishtop_test_bot`).
5. BotFather sizga **TOKEN** beradi. Uni saqlab qo'ying.
6. Backend `.env` fayliga `TELEGRAM_BOT_TOKEN` ni qo'shing.

## 2-qadam: Loyihani ishga tushirish (Tunnel bilan)

Men sizga tayyor `start-miniapp.bat` faylini tayyorlab berdim. Uni ishga tushiring:

```powershell
./start-miniapp.bat
```

Bu quyidagilarni bajaradi:
1. Backendni ishga tushiradi (`localhost:5000`).
2. Frontendni ishga tushiradi (`localhost:3000`).
3. Frontend uchun **Public URL** (https://....loca.lt) beradi.

## 3-qadam: Botni sozlash

Terminalda paydo bo'lgan **Frontend URL** nusxalang (masalan: `https://dark-tiger-99.loca.lt`).

1. **BotFather** ga qayting.
2. `/mybots` ni bosing va botingizni tanlang.
3. **Bot Settings** -> **Menu Button** -> **Configure Menu Button** ni bosing.
4. O'sha URL manzilni yuboring va tugma nomini yozing (masalan, "Ilovani ochish").
5. Agar so'rasa, `localtunnel` saytiga bir marta kirib, parolni ("Click to Continue") bosish kerak bo'ladi.

## Muhim Eslatma
**localtunnel** vaqtinchalik yechim. Har safar o'chganda URL o'zgarishi mumkin.
Doimiy ishlashi uchun loyihani **Vercel** (Frontend) va **Railway/Render** (Backend) ga joylash tavsiya etiladi.
