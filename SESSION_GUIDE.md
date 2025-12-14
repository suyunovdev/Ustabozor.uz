# Session Management Guide - Mardikor Platform

## 📋 Umumiy ma'lumot

Mardikor platformasida **bir brauzer sessiyasida faqat bitta foydalanuvchi** login bo'lishi mumkin. Bu standart web application xavfsizlik amaliyotidir.

## 🔐 Session qoidalari

### Bitta session printsipi
- Har bir brauzer sessiyasida faqat **bitta aktiv foydalanuvchi** bo'lishi mumkin
- Yangi foydalanuvchi login qilganda, oldingi foydalanuvchining sessioni avtomatik ravishda tugaydi
- Bu xavfsizlik va ma'lumotlar xavfsizligi uchun zarur

### Login qilish jarayoni
1. Agar siz allaqachon login qilgan bo'lsangiz va boshqa foydalanuvchi login qilmoqchi bo'lsa, tasdiqlash xabari ko'rinadi
2. Tasdiqlasangiz, oldingi foydalanuvchining ma'lumotlari o'chadi va yangi foydalanuvchi login qiladi
3. Bekor qilsangiz, hozirgi session davom etadi

## 🧪 Ko'p foydalanuvchilarni test qilish

Agar bir vaqtning o'zida bir nechta foydalanuvchilarni test qilmoqchi bo'lsangiz, quyidagi usullardan foydalaning:

### Variant 1: Incognito/Private Mode (Tavsiya etiladi)
```
1. Oddiy brauzer tabida birinchi foydalanuvchi bilan login qiling
2. Incognito/Private tab oching (Ctrl+Shift+N yoki Cmd+Shift+N)
3. Incognito tabda ikkinchi foydalanuvchi bilan login qiling
4. Har ikkala tab mustaqil ravishda ishlaydi
```

**Incognito tab ochish:**
- **Chrome/Edge:** `Ctrl + Shift + N` (Windows) yoki `Cmd + Shift + N` (Mac)
- **Firefox:** `Ctrl + Shift + P` (Windows) yoki `Cmd + Shift + P` (Mac)
- **Safari:** `Cmd + Shift + N` (Mac)

### Variant 2: Turli brauzerlar
```
1. Chrome'da birinchi foydalanuvchi bilan login qiling
2. Firefox'da ikkinchi foydalanuvchi bilan login qiling
3. Edge'da uchinchi foydalanuvchi bilan login qiling
```

### Variant 3: Turli brauzer profillari
Chrome va Edge'da turli foydalanuvchi profillari yaratish mumkin:
```
1. Brauzer sozlamalariga kiring
2. "Add person" yoki "Add profile" tugmasini bosing
3. Har bir profil alohida session yaratadi
```

## 💡 Test uchun maslahatlar

### Demo foydalanuvchilar
Platformada quyidagi test foydalanuvchilar mavjud:

**Mijozlar (Customers):**
- Email: `client@mardikor.uz` | Parol: `password123`
- Email: `client2@mardikor.uz` | Parol: `password123`

**Ishchilar (Workers):**
- Email: `worker1@mardikor.uz` | Parol: `password123`
- Email: `worker2@mardikor.uz` | Parol: `password123`

**Admin:**
- Email: `admin@mardikor.uz` | Parol: `admin`

### Test ssenariysi
```
1. Oddiy tabda mijoz sifatida login qiling
2. Incognito tabda ishchi sifatida login qiling
3. Mijoz buyurtma yaratsin
4. Ishchi buyurtmani qabul qilsin
5. Chat orqali muloqot qiling
```

## 🔧 Texnik ma'lumotlar (Developerlar uchun)

### Session saqlash
- Foydalanuvchi ma'lumotlari `localStorage.currentUser` da saqlanadi
- Theme sozlamalari `localStorage.theme` da saqlanadi
- Logout qilganda `sessionStorage` to'liq tozalanadi

### Session validation
- Sahifa yangilanganda session avtomatik tiklanadi
- Agar `currentUser` mavjud bo'lsa, foydalanuvchi avtomatik login qilinadi

### Multi-session support
Agar kelajakda bir brauzerda ko'p foydalanuvchilarni qo'llab-quvvatlash kerak bo'lsa:
- Session ID tizimini qo'shish kerak
- Backend'da session management implementatsiya qilish kerak
- Token-based authentication (JWT) ishlatish tavsiya etiladi

## ❓ FAQ

**Q: Nima uchun bir brauzerda faqat bitta foydalanuvchi login bo'lishi mumkin?**
A: Bu standart web application xavfsizlik amaliyoti. Ko'pchilik web saytlar (Gmail, Facebook, Twitter) ham shunday ishlaydi.

**Q: Agar men bir vaqtning o'zida ikki foydalanuvchini test qilmoqchi bo'lsam?**
A: Incognito tab yoki boshqa brauzer ishlatishingiz mumkin. Yuqoridagi "Ko'p foydalanuvchilarni test qilish" bo'limiga qarang.

**Q: Logout qilmasdan yangi foydalanuvchi bilan login qilsam nima bo'ladi?**
A: Tasdiqlash xabari ko'rinadi. Tasdiqlasangiz, oldingi foydalanuvchi avtomatik logout qilinadi va yangi foydalanuvchi login qiladi.

**Q: Session qachon tugaydi?**
A: Session faqat logout qilganda yoki yangi foydalanuvchi login qilganda tugaydi. Sahifani yangilash yoki brauzer yopish session'ni tugatmaydi.

## 🛡️ Xavfsizlik

- Hech qachon parollaringizni boshqalar bilan bo'lishmaslik
- Umumiy kompyuterda ishlagandan keyin doim logout qilish
- Incognito mode'da test qilgandan keyin tabni yopish
