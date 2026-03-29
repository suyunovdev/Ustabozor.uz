# 📋 USTABOZOR.UZ — TO'LIQ LOYIHA HISOBOTI

> **Versiya:** 1.3.0 | **Sana:** 2026-yil mart | **Holat:** Ishlab chiqish (Development)

---

## 📌 MUNDARIJA

1. [Loyiha haqida](#1-loyiha-haqida)
2. [Texnologiyalar steki](#2-texnologiyalar-steki)
3. [Arxitektura](#3-arxitektura)
4. [Backend](#4-backend)
5. [Web Frontend](#5-web-frontend)
6. [Mobil Ilova](#6-mobil-ilova)
7. [Ma'lumotlar bazasi](#7-malumotlar-bazasi)
8. [Real-time tizim](#8-real-time-tizim)
9. [Xavfsizlik](#9-xavfsizlik)
10. [API dokumentatsiya](#10-api-dokumentatsiya)
11. [Fayllar tuzilmasi](#11-fayllar-tuzilmasi)
12. [O'rnatish va ishga tushirish](#12-ornatish-va-ishga-tushirish)
13. [Deployment](#13-deployment)
14. [Muammolar va yechimlar](#14-muammolar-va-yechimlar)
15. [Kelajak rejalari](#15-kelajak-rejalari)

---

## 1. LOYIHA HAQIDA

**Ustabozor.uz** — O'zbekiston uchun ishchi xizmatlarini ulash platformasi. Mijozlar (buyurtmachilar) va ustalar (ishchilar) o'rtasida ko'prik vazifasini bajaradi.

### 🎯 Asosiy maqsad
Uy-ro'zg'or, qurilish, ta'mirlash va boshqa xizmatlarni ko'rsatuvchi ustalarni buyurtmachilar bilan tezda ulash. Har bir muddatli ishni professional mutaxassislarga topshirish imkoniyati.

### 👥 Foydalanuvchi turlari

| Rol | Tavsif | Asosiy funksiyalar |
|-----|--------|-------------------|
| **Buyurtmachi (Customer)** | Xizmat buyurtma qiluvchi | Usta qidirish, buyurtma berish, baho qo'yish |
| **Usta (Worker)** | Xizmat ko'rsatuvchi mutaxassis | Ishlarni qabul qilish, bajarish, daromad olish |
| **Admin** | Platforma boshqaruvchisi | Statistika, foydalanuvchilar, moliya nazorati |

### 📊 Platforma statistikasi (joriy)
- **Kategoriyalar:** 10 ta (Santexnik, Elektrik, Duradgor, Rassomchilik, Tozalik, Haydovchi, Quruvchi, Bog'bon, Kompyuter, Boshqa)
- **Daromad taqsimoti:** 90% usta / 10% platforma komissiyasi
- **Buyurtma holatlari:** PENDING → ACCEPTED → IN_PROGRESS → COMPLETED / CANCELLED

---

## 2. TEXNOLOGIYALAR STEKI

### 🔧 Backend
```
Node.js + Express 5          — Web server framework
Firebase Admin SDK 12         — Firestore NoSQL database
Firebase Authentication       — Google OAuth
Socket.IO 4.8                 — Real-time WebSocket
JWT (jsonwebtoken)            — Autentifikatsiya tokenlar
bcryptjs                      — Parol shifrlash
Multer 2                      — Fayl yuklash (multipart/form-data)
Helmet                        — HTTP xavfsizlik headerlari
express-rate-limit            — So'rovlar limitatsiyasi
CORS                          — Cross-Origin Resource Sharing
dotenv                        — Muhit o'zgaruvchilari
```

### 🌐 Web Frontend
```
React 18 + TypeScript         — UI framework
Vite                          — Build tool
TailwindCSS                   — Utility-first CSS
Lucide React                  — Icon kutubxonasi
Socket.IO Client              — Real-time ulanish
React Toastify                — Bildirishnomalar
Google Maps API               — Xarita va geolokatsiya
```

### 📱 Mobil Ilova
```
React Native 0.81.5           — Cross-platform mobil framework
Expo SDK 54                   — Mobil development platform
Expo Router 6                 — File-based routing
TypeScript                    — Type safety
Socket.IO Client              — Real-time chat
AsyncStorage                  — Lokal ma'lumotlar saqlash
expo-image-picker             — Rasm tanlash (avatar)
expo-notifications            — Push bildirishnomalar
expo-secure-store             — Xavfsiz token saqlash
react-native-reanimated       — Animatsiyalar
```

### ☁️ Bulut xizmatlar
```
Firebase Firestore             — NoSQL cloud database
Firebase Storage               — Fayl saqlash
Firebase Auth                  — OAuth provider
Vercel                         — Web deployment
ImgBB API                      — Rasm hosting (avatar)
```

---

## 3. ARXITEKTURA

```
┌─────────────────────────────────────────────────────────────────┐
│                         USTABOZOR.UZ                            │
├──────────────┬──────────────────────────┬───────────────────────┤
│  WEB (React) │   BACKEND (Node.js)      │  MOBILE (React Native)│
│  Vercel      │   Port: 5001             │  Expo Go / APK        │
│              │                          │                       │
│  ┌─────────┐ │  ┌───────────────────┐  │  ┌─────────────────┐  │
│  │Customer │ │  │   REST API        │  │  │ Customer App    │  │
│  │  Pages  │◄├─►│   /api/*          │◄─┼─►│ (tabs)          │  │
│  └─────────┘ │  │                   │  │  └─────────────────┘  │
│  ┌─────────┐ │  │   Socket.IO       │  │  ┌─────────────────┐  │
│  │ Worker  │◄├─►│   ws://           │◄─┼─►│ Worker App      │  │
│  │  Pages  │ │  │                   │  │  │ (tabs)          │  │
│  └─────────┘ │  └────────┬──────────┘  │  └─────────────────┘  │
│  ┌─────────┐ │           │             │                       │
│  │  Admin  │ │  ┌────────▼──────────┐  │                       │
│  │  Panel  │ │  │    Firebase       │  │                       │
│  └─────────┘ │  │    Firestore      │  │                       │
└──────────────┤  └───────────────────┘  └───────────────────────┘
               └─────────────────────────────────────────────────
```

### Arxitektura qarorlari

| Qaror | Sabab |
|-------|-------|
| Firestore (NoSQL) | Real-time so'rovlar, flexible schema, cloud-native |
| Socket.IO | Ikki tomonlama real-time xabar almashish |
| JWT token (7 kun) | Stateless auth, mobil uchun qulay |
| FormData multipart | Rasm va matnni birgalikda yuborish |
| Expo Router (file-based) | Deklarativ navigatsiya, deep linking |
| ThemeContext + AsyncStorage | Dark/Light mode persistentligi |

---

## 4. BACKEND

### 📂 Fayl tuzilmasi
```
backend/
├── server.js              # Express app, middleware, routelar
├── socket.js              # Socket.IO event handler
├── config/
│   ├── db.js              # Firebase Admin SDK initialization
│   └── serviceAccountKey.json
├── routes/
│   ├── auth.js            # Login, register, Google OAuth
│   ├── users.js           # CRUD, profil, avatar upload
│   ├── orders.js          # Buyurtmalar CRUD + timeline
│   ├── chats.js           # Chat xonalari
│   ├── messages.js        # Xabarlar
│   ├── notifications.js   # Push bildirishnomalar
│   ├── upload.js          # Fayl yuklash (ImgBB)
│   └── reports.js         # Admin hisobotlari
├── middleware/
│   └── auth.js            # JWT token tekshirish
├── models/
│   ├── firestore.js       # Umumiy Firestore yordamchilari
│   ├── User.js            # Users kolleksiyasi ref
│   ├── Order.js           # Orders kolleksiyasi ref
│   ├── Chat.js            # Chats kolleksiyasi ref
│   ├── Message.js         # Messages kolleksiyasi ref
│   └── Notification.js    # Notifications kolleksiyasi ref
└── utils/
    └── cache.js           # In-memory LRU cache (50MB)
```

### 🔒 Middleware zanjiri
```
Request
   │
   ▼
CORS (origin check: *.vercel.app, localhost, 192.168.*)
   │
   ▼
Rate Limiter (1000 req/15min umumiy, 50 req/15min auth)
   │
   ▼
Body Parser (JSON + text/plain)
   │
   ▼
Routes (/api/auth, /api/users, /api/orders, ...)
   │
   ▼
JWT Auth Middleware (himoyalangan endpointlar uchun)
   │
   ▼
Controller (Firestore query)
   │
   ▼
Response
```

### 📦 Kesh tizimi
`utils/cache.js` — Xotira asosidagi LRU kesh:
- **Maksimal hajm:** 1000 yozuv / 50 MB
- **Default TTL:** 5 daqiqa (300,000 ms)
- **Namespace invalidation:** `deleteNamespace('orders')` — barcha buyurtma keshlarini tozalaydi
- **Tag-based invalidation:** `deleteByTag('orders')`
- **Qo'llaniladi:** Orders, Users ro'yxatlari uchun

---

## 5. WEB FRONTEND

### 📄 Sahifalar tuzilmasi
```
pages/
├── Auth.tsx               # Login + Register + Google OAuth
├── Profile.tsx            # Umumiy profil (mijoz + usta)
├── ChatPage.tsx           # Chat interfeysi
├── OrderDetail.tsx        # Buyurtma tafsilotlari
├── MapFinder.tsx          # Xarita asosida usta qidirish
├── customer/
│   ├── CustomerHome.tsx   # Bosh sahifa (ustalar lenti)
│   ├── CreateOrder.tsx    # Buyurtma yaratish
│   └── MyOrders.tsx       # Mening buyurtmalarim
├── worker/
│   ├── JobFeed.tsx        # Ish e'lonlari lenti
│   └── MyJobs.tsx         # Mening ishlarim
└── admin/
    ├── Dashboard.tsx      # Admin bosh panel
    ├── AdminUsers.tsx     # Foydalanuvchilar boshqaruvi
    ├── AdminOrders.tsx    # Buyurtmalar boshqaruvi
    └── AdminFinance.tsx   # Moliyaviy hisobotlar
```

### 🎨 Web UI xususiyatlari
- **Dark/Light mode** — TailwindCSS `dark:` prefixi, localStorage persistentligi
- **Responsive design** — Mobile-first, 320px dan 1920px gacha
- **Gradient headerlar** — Blue→Indigo→Purple gradientlar
- **Skeleton loaders** — Ma'lumot yuklanayotganda placeholder
- **Toast bildirishnomalar** — react-toastify
- **Avatar crop** — Canvas API bilan circular crop + zoom slider
- **Google Maps** — Xarita asosida usta qidirish, manzil tanlash
- **Real-time chat** — Socket.IO, o'qildi belgisi (✓✓), yetkazildi belgisi

### 🧩 Asosiy komponentlar
```
components/
├── Layout.tsx             # Umumiy layout (nav, sidebar)
├── EditProfileModal.tsx   # Profil tahrirlash modali
├── WalletModal.tsx        # Hamyon — balans, to'ldirish
├── LocationModal.tsx      # Manzil tanlash (Geolocation API)
├── NotificationsPanel.tsx # Bildirishnomalar paneli
├── OrderTimeline.tsx      # Buyurtma holat tarixi
├── JobsStatsModal.tsx     # Ish statistikasi modali
├── MapLocationPicker.tsx  # Google Maps location picker
├── BannedScreen.tsx       # Bloklangan foydalanuvchi ekrani
└── chat/
    ├── ChatList.tsx       # Chat ro'yxati
    ├── ChatWindow.tsx     # Chat oynasi
    ├── ChatInput.tsx      # Xabar kiritish
    └── MessageBubble.tsx  # Xabar pufakchasi
```

---

## 6. MOBIL ILOVA

### 📱 Ilova tuzilmasi (Expo Router)
```
mobile/
├── app/
│   ├── _layout.tsx              # Root layout (Auth + Theme provider)
│   ├── index.tsx                # Boshlang'ich yo'naltirish
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Login ekrani
│   │   ├── register.tsx         # Ro'yxatdan o'tish
│   │   ├── role-select.tsx      # Rol tanlash (mijoz/usta)
│   │   └── worker-setup.tsx     # Usta sozlamalari
│   ├── (customer)/
│   │   ├── _layout.tsx          # Tab navigatsiya (5 tab)
│   │   ├── index.tsx            # Bosh sahifa (usta lenti)
│   │   ├── orders.tsx           # Mening buyurtmalarim
│   │   ├── create.tsx           # Buyurtma yaratish
│   │   ├── chats.tsx            # Chatlar ro'yxati
│   │   └── profile.tsx          # Profil (advanced)
│   ├── (worker)/
│   │   ├── _layout.tsx          # Tab navigatsiya (4 tab)
│   │   ├── index.tsx            # Ish e'lonlari lenti
│   │   ├── myjobs.tsx           # Mening ishlarim
│   │   ├── chats.tsx            # Chatlar ro'yxati
│   │   └── profile.tsx          # Profil (advanced)
│   ├── chat/
│   │   └── [id].tsx             # Chat ekrani (Socket.IO)
│   └── order/
│       └── [id].tsx             # Buyurtma tafsilotlari
├── components/
│   └── EditProfileModal.tsx     # Profil tahrirlash modali
├── hooks/
│   ├── useAuth.ts               # Auth context + hook
│   ├── useTheme.ts              # Dark/Light theme hook
│   └── useUnreadCount.ts        # O'qilmagan xabarlar soni
├── services/
│   └── api.ts                   # REST API + type definitions
└── constants/
    └── index.ts                 # API URL, ranglar, kategoriyalar
```

### 📱 Mijoz (Customer) ekranlar

#### 🏠 Bosh sahifa (`index.tsx`)
- Blue gradient header (`#2563EB`) — joylashuv, avatar
- "Bugun qanday xizmat kerak?" — qidiruv satri
- 9 kategoriya — 3 ustunli grid, rang-barang
- Sort pills — Online / Reyting / Baholar / Narx
- Usta kartalar — online dot, reyting, Chat + Yollash tugmalari
- 4 ta skeleton loader

#### 📋 Buyurtmalar (`orders.tsx`)
- Orange gradient header — 3 stat (Jami / Faol / Sarflangan)
- Floating tabs — Barchasi / Faol(N) / Bajarilgan
- Order karta — rang chizig'i, holat badge, usta info, narx
- Order Timeline — inline component
- Aksiyalar: Chat, Bekor qilish, ⭐ Baholash
- Baho berish modali — yulduzlar + izoh

#### ➕ Buyurtma yaratish (`create.tsx`)
- Tanlangan usta kartasi (yashil gradient)
- AI Yordamchi bloki — matn to'ldirish simulyatsiyasi
- Kategoriya pills — gorizontal scroll
- Manzil dashed border bilan
- "E'lon qilish →" submit tugmasi

#### 👤 Profil (`profile.tsx`)
- Blue gradient header + dekorativ blob-lar
- Floating profile card — avatar, ism, badgelar, reyting, completion bar
- Weighted completion (15+10+15+15+20+10+10+5 = 100%)
- StatCard — Hamyon, Reyting, Buyurtmalar (vertical)
- Platform statistika banneri (indigo gradient)
- Achievements — gorizontal scroll, ✓ tick badge
- Menu sections — Profil / Moliya / Ilova
- Dark/Light mode toggle (animated switch)
- Logout modal — icon + gradient tugma

### 🔧 Usta (Worker) ekranlar

#### 🔍 Ish lenti (`index.tsx`)
- Blue gradient header — salom, Online/Offline toggle
- 3 stat box — Bugun / Bajarilgan / Reyting
- Sticky filter bar — qidiruv + 🔄 yangilash + sort/kategoriya pills
- Ish kartalar — `⚡ Sizga mos` AI badge, vaqt, mijoz info
- Qabul qilish tugmasi (offline da disabled)

#### 📋 Mening ishlarim (`myjobs.tsx`)
- Indigo gradient header — Jami daromad + Kutilmoqda
- 3 tab — ⚡ Faol / ✅ Tarix / 💵 Daromad
- Ish kartasi — 5px rang chizig'i, mijoz info, narx breakdown
- Narx taqsimoti: Buyurtma → 10% komissiya → **90% daromad**
- Tugatish + to'lov modali — breakdown + tasdiqlash
- Daromad tab — statistika + tarixi + Hamyon tugmasi

#### 👤 Profil (`profile.tsx`)
- Indigo gradient header (`#4F46E5`) + Online/Offline pill (bosiladi)
- Ko'nikmalar chips — maks 4 + "+N"
- "90% daromad" banneri (purple)
- "Ish holati" menu section — toggle bilan
- Qolgan hamma narsa mijoz profili bilan bir xil

### 🔄 Umumiy ekranlar

#### 💬 Chat (`chat/[id].tsx`)
- Socket.IO real-time xabarlar
- Optimistik UI — xabar darhol ko'rinadi
- Holat ikonlari — ✓ yuborildi / ✓✓ yetkazildi / ✓✓ o'qildi (ko'k)
- Fayl biriktirish imkoniyati
- Typing indicator

#### 📄 Buyurtma tafsilotlari (`order/[id].tsx`)
- Holat banneri — rang asosida
- Info kartalar — kategoriya, narx, tavsif
- Ikkinchi tomon kartasi — avatar, reyting, telefon
- Daromad breakdown kartasi (ustalar uchun, yashil)
- Order Timeline — yaratildi → qabul → boshlandi → bajarildi
- Sticky aksiya satri — chat + asosiy tugma (holat/rolga qarab)
- Baho modali — katta yulduzlar (44px)

---

## 7. MA'LUMOTLAR BAZASI

### 🗄️ Firestore kolleksiyalari

#### `users` kolleksiyasi
```typescript
{
  id: string              // Firestore doc ID
  name: string            // Ism
  surname: string         // Familiya
  phone: string           // +998XXXXXXXXX
  email: string           // Email
  password: string        // bcrypt hash
  role: 'CUSTOMER' | 'WORKER' | 'ADMIN'
  avatar: string          // URL
  balance: number         // So'm (pul)
  rating: number          // 0.0 - 5.0
  ratingCount: number     // Baholar soni
  isOnline: boolean       // Hozir onlinemi
  lastSeen: string        // ISO timestamp
  skills: string[]        // Ko'nikmalar (Usta uchun)
  hourlyRate: number      // Soatlik narx (Usta uchun)
  completedJobs: number   // Bajarilgan ishlar soni
  isDeleted: boolean      // Soft delete
  isBanned: boolean       // Bloklangan
  oauthProvider?: string  // 'google' | null
  createdAt: string       // ISO timestamp
  updatedAt: string       // ISO timestamp
}
```

#### `orders` kolleksiyasi
```typescript
{
  id: string
  customerId: string      // User ref
  workerId?: string       // User ref (qabul qilingandan keyin)
  title: string
  description: string
  category: string        // Kategoriya nomi
  price: number           // So'm
  status: 'PENDING' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  location: string        // Manzil matni
  lat?: number            // Kenglik
  lng?: number            // Uzunlik
  review?: {              // Bajarilgandan keyin
    rating: number
    comment: string
    createdAt: string
  }
  acceptedAt?: string     // Qabul vaqti
  startedAt?: string      // Boshlanish vaqti
  completedAt?: string    // Tugash vaqti
  createdAt: string
  updatedAt: string
}
```

#### `chats` kolleksiyasi
```typescript
{
  id: string
  participants: string[]  // [userId1, userId2]
  lastMessage?: Message
  unreadCount: number
  createdAt: string
  updatedAt: string
}
```

#### `messages` kolleksiyasi
```typescript
{
  id: string
  chatId: string
  senderId: string
  content: string
  status: 'SENT' | 'DELIVERED' | 'READ'
  attachments?: {
    name: string
    url: string
    type: string
  }[]
  createdAt: string
}
```

#### `notifications` kolleksiyasi
```typescript
{
  id: string
  userId: string
  title: string
  body: string
  type: 'ORDER_NEW' | 'ORDER_ACCEPTED' | 'ORDER_COMPLETED' | 'MESSAGE' | ...
  isRead: boolean
  data?: any              // Qo'shimcha ma'lumot (orderId, chatId, ...)
  createdAt: string
}
```

### 🔍 Firestore indekslari
```json
// firestore.indexes.json
orders: [
  { customerId ASC, createdAt DESC },
  { workerId ASC, status ASC, createdAt DESC },
  { status ASC, createdAt DESC },
  { category ASC, status ASC }
]
users: [
  { role ASC, isOnline DESC, rating DESC },
  { role ASC, skills ARRAY_CONTAINS }
]
```

---

## 8. REAL-TIME TIZIM

### Socket.IO Event arxitekturasi

#### Client → Server eventlar
```javascript
'user:online'    { userId }          // Foydalanuvchi onlayn bo'ldi
'user:offline'   { userId }          // Foydalanuvchi oflayn bo'ldi
'chat:join'      { chatId }          // Chat xonasiga kirish
'chat:leave'     { chatId }          // Chat xonasidan chiqish
'message:send'   { chatId, content, senderId }  // Xabar yuborish
'message:read'   { chatId, userId }  // O'qildi belgisi
'typing:start'   { chatId, userId }  // Yozmoqda...
'typing:stop'    { chatId, userId }  // Yozishni to'xtatdi
```

#### Server → Client eventlar
```javascript
'user:status'    { userId, isOnline }           // Foydalanuvchi holati
'message:new'    { ...message }                 // Yangi xabar
'message:status' { messageId, status }          // Xabar holati
'typing'         { chatId, userId, isTyping }   // Typing indikator
'order:updated'  { orderId, status }            // Buyurtma yangilandi
```

#### Online foydalanuvchilar boshqaruvi
```javascript
// Server
const onlineUsers = new Map(); // userId → Set<socketId>

// Bir foydalanuvchi bir nechta qurilmadan kirishi mumkin
onlineUsers.get(userId).add(socket.id);

// Disconnect bo'lganda
onlineUsers.get(userId).delete(socket.id);
if (onlineUsers.get(userId).size === 0) {
  // Haqiqatda offline
  onlineUsers.delete(userId);
  // Firestore yangilash
}
```

---

## 9. XAVFSIZLIK

### 🔐 Autentifikatsiya
- **JWT token** — 7 kunlik amal qilish muddati
- **bcrypt** — parollar hash qilinadi (salt rounds: 10)
- **Token tekshirish** — har bir himoyalangan endpointda
- **Auto-logout** — 401 javob kelganda avtomatik chiqish
- **Google OAuth** — Firebase Authentication orqali

### 🛡️ Rate Limiting
| Endpoint turi | Limit | Oyna |
|---------------|-------|------|
| Umumiy API | 1000 req | 15 daqiqa |
| Auth (login/register) | 50 req | 15 daqiqa |
| Local IP (192.168.*) | Cheksiz | — |

### 🌐 CORS siyosati
```javascript
Ruxsat etilgan originlar:
✅ https://*.vercel.app
✅ http://localhost:*
✅ http://192.168.*   (lokal tarmoq — mobil qurilmalar)
✅ FRONTEND_URL .env da ko'rsatilgan URL lar
❌ Boshqa originlar — bloklangan
```

### 🔒 Helmet headerlar
```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
Cross-Origin-Resource-Policy: cross-origin (rasmlar uchun)
Content-Security-Policy: o'chirilgan (SPA uchun)
```

### 🚫 Boshqa himoyalar
- **Soft delete** — foydalanuvchilar o'chirilmaydi, `isDeleted: true` qo'yiladi
- **Ban mexanizmi** — `isBanned: true` — login qila olmaydi
- **Input validatsiya** — telefon (+998XXXXXXXXX), email, ism formatlari tekshiriladi
- **Password migration** — eski plain-text parollar bcrypt ga ko'chiriladi

---

## 10. API DOKUMENTATSIYA

### 🔑 Auth endpointlari
```http
POST /api/auth/login
Body: { email, password }
Response: { ...user, token }

POST /api/auth/register
Body: { name, surname, phone, email, password, role }
Response: { ...user, token }

POST /api/auth/google
Body: { idToken }
Response: { ...user, token } | { needsRole: true, googleData }

POST /api/auth/google/complete
Body: { idToken, role, phone }
Response: { ...user, token }
```

### 👤 Users endpointlari
```http
GET    /api/users                    # Barcha ustalar (role=WORKER filter)
GET    /api/users/:id                # Bitta foydalanuvchi
PUT    /api/users/:id                # Profil yangilash (multipart)
DELETE /api/users/:id                # Soft delete

GET    /api/users/:id/balance        # Balans
POST   /api/users/:id/balance        # Balans to'ldirish

POST   /api/users/:id/toggle-online  # Online/Offline
```

### 📋 Orders endpointlari
```http
GET    /api/orders                   # Buyurtmalar (filter: customerId, workerId, status)
GET    /api/orders/:id               # Bitta buyurtma (populate: customer, worker)
POST   /api/orders                   # Yangi buyurtma yaratish
PUT    /api/orders/:id               # Holat o'zgartirish (accept, start, complete, cancel)
DELETE /api/orders/:id               # Buyurtmani o'chirish

POST   /api/orders/:id/review        # Baho berish
Body: { rating: 1-5, comment: string }
```

### 💬 Chats & Messages
```http
GET    /api/chats                    # Foydalanuvchi chatlari (?userId=...)
POST   /api/chats                    # Chat yaratish/olish
Body: { participants: [userId1, userId2] }

GET    /api/chats/:id/messages       # Xabarlar tarixi
POST   /api/chats/:id/messages       # Xabar yuborish
POST   /api/chats/:id/read           # O'qildi belgisi
Body: { userId }
```

### 🔔 Notifications
```http
GET    /api/notifications            # Bildirishnomalar (?userId=...)
PUT    /api/notifications/:id/read   # O'qildi
PUT    /api/notifications/read-all   # Barchasini o'qildi
```

### 📤 Upload
```http
POST   /api/upload
Content-Type: multipart/form-data
Field: file (image/*)
Response: { url: "https://i.ibb.co/..." }
```

### ⚠️ Xato kodlari
| Kod | Ma'no |
|-----|-------|
| 400 | Noto'g'ri so'rov (validatsiya xatosi) |
| 401 | Autentifikatsiya talab etiladi |
| 403 | Ruxsat yo'q (ban, delete) |
| 404 | Topilmadi |
| 429 | Juda ko'p so'rov (rate limit) |
| 500 | Server ichki xatosi (Firestore quota, ...) |

---

## 11. FAYLLAR TUZILMASI

```
Ustabozor.uz/
├── 📁 backend/                    # Node.js server (2,235 LOC)
│   ├── server.js                  # Asosiy server fayli (179 LOC)
│   ├── socket.js                  # Socket.IO handler (239 LOC)
│   ├── routes/                    # 8 ta route fayl
│   │   ├── auth.js                # (308 LOC)
│   │   ├── orders.js              # (408 LOC)
│   │   ├── users.js               # (450 LOC)
│   │   └── ...
│   ├── models/                    # Firestore model refs
│   ├── middleware/auth.js         # JWT middleware
│   └── utils/cache.js             # LRU cache
│
├── 📁 pages/                      # Web React sahifalar
│   ├── Auth.tsx                   # Login/Register
│   ├── Profile.tsx                # Advanced profil (544 LOC)
│   ├── customer/                  # 3 sahifa
│   ├── worker/                    # 2 sahifa
│   └── admin/                     # 4 sahifa
│
├── 📁 components/                 # Web komponentlar
│   ├── Layout.tsx                 # Asosiy layout
│   ├── chat/                      # 4 chat komponenti
│   └── admin/                     # 8 admin komponenti
│
├── 📁 mobile/                     # React Native ilovasi (5,313 LOC)
│   ├── app/                       # 15 ta ekran
│   │   ├── (auth)/                # 4 ekran (login, register, role, setup)
│   │   ├── (customer)/            # 5 ekran + layout
│   │   ├── (worker)/              # 5 ekran + layout
│   │   ├── chat/[id].tsx          # Dynamic chat
│   │   └── order/[id].tsx         # Dynamic order detail (416 LOC)
│   ├── components/
│   │   └── EditProfileModal.tsx   # Modal komponent
│   ├── hooks/
│   │   ├── useAuth.ts             # Auth state
│   │   ├── useTheme.ts            # Dark/Light theme
│   │   └── useUnreadCount.ts      # Unread badge
│   ├── services/api.ts            # 226 LOC — barcha API call lar
│   └── constants/index.ts         # URL, ranglar, konstantalar
│
├── HISOBOT.md                     # ← Shu fayl
└── README.md
```

**Jami kod satrlari:**
| Qism | LOC |
|------|-----|
| Backend | ~2,235 |
| Web (pages + components) | ~4,500+ |
| Mobil | ~5,313 |
| **Jami** | **~12,000+** |

---

## 12. O'RNATISH VA ISHGA TUSHIRISH

### Talablar
```
Node.js    >= 18.x
npm        >= 9.x
Expo CLI   >= 6.x
```

### 1. Backend
```bash
cd backend
npm install

# .env faylini sozlang:
PORT=5001
FRONTEND_URL=http://localhost:3000,...
FIREBASE_SERVICE_ACCOUNT_PATH=./config/serviceAccountKey.json
JWT_SECRET=your-secret-key

# Ishga tushirish
node server.js
# yoki
npx nodemon server.js

# ✅ "Server + Socket.IO running on http://localhost:5001"
```

### 2. Web Frontend
```bash
# Root katalogda
npm install
npm run dev

# ✅ http://localhost:3000 (yoki boshqa port)
```

### 3. Mobil Ilova
```bash
cd mobile
npm install

# constants/index.ts da IP ni o'zgartiring:
# API_URL = 'http://YOUR_LOCAL_IP:5001/api'
# SOCKET_URL = 'http://YOUR_LOCAL_IP:5001'

# Expo Go bilan ishga tushirish
npx expo start

# APK build qilish
npx expo build:android
# yoki EAS bilan:
eas build -p android
```

### IP manzil aniqlash (macOS)
```bash
ipconfig getifaddr en0
# Natija: 192.168.X.X — shu IP ni mobile/constants/index.ts ga kiriting
```

---

## 13. DEPLOYMENT

### 🌐 Web (Vercel)
```
Platform: Vercel
URL: https://ustabozor-uz-5wha.vercel.app
Build: npm run build (Vite)
Auto-deploy: GitHub main branch ga push bo'lganda
```

### ⚙️ Backend (lokal / server)
```bash
# PM2 bilan production da ishga tushirish
npm install -g pm2
cd backend
pm2 start server.js --name "ustabozor-backend"
pm2 save
pm2 startup
```

### 📱 Mobil (Expo EAS)
```bash
# app.json
bundleIdentifier: uz.ustabozor.app (iOS)
package: uz.ustabozor.app (Android)

# EAS build
eas build -p android --profile production
eas build -p ios --profile production
```

### 🔥 Firebase
```
Project: usta-top-a2a92
Firestore: Native mode, nam1 region
Storage: usta-top-a2a92.firebasestorage.app
Plan: Spark (free) → upgrade Blaze tavsiya etiladi

⚠️ Muhim: Free plan limiti:
- 50,000 reads/kun
- 20,000 writes/kun
- 1 GB storage
```

---

## 14. MUAMMOLAR VA YECHIMLAR

### 🐛 Hal qilingan muammolar

#### 1. FormData + Content-Type konflikti
**Muammo:** `fetch` bilan FormData yuborilganda `Content-Type: application/json` header avtomatik qo'yiladi va multipart boundary yo'qoladi → server faylni o'qiy olmaydi → 429/500 xatosi.

**Yechim:**
```typescript
// api.ts — request() funksiyasida
const isFormData = options.body instanceof FormData;
headers: {
  ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
  // FormData bo'lsa — React Native o'zi to'g'ri header qo'shadi
}
```

#### 2. Network request timed out
**Muammo:** `fetch` ga timeout qo'yilmagan — server javob bermasa cheksiz kutadi.

**Yechim:**
```typescript
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 15_000);
const res = await fetch(url, { signal: controller.signal });
// AbortError → "Server bilan aloqa yo'q (timeout)"
```

#### 3. CORS block (Expo Go)
**Muammo:** Expo Go `http://192.168.10.180:8081` originidan so'rov yuboradi, backend buni bloklaydi.

**Yechim:** `server.js` da:
```javascript
} else if (origin && origin.match(/^http:\/\/192\.168\./)) {
  callback(null, true); // Lokal tarmoq — ruxsat
}
```

#### 4. Firestore Quota Exceeded (429)
**Muammo:** Firebase free plan — kunlik 50,000 read limiti to'ldi.

**Yechim:**
- Kesh tizimi — takroriy so'rovlarni kamaytiradi
- Blaze planga o'tish tavsiya etiladi

#### 5. user._id vs user.id
**Muammo:** Firestore doc ID → `_id`, lekin frontend `id` kutadi.

**Yechim:**
```typescript
const transformUser = (u: any): User => ({
  _id: u._id || u.id,
  id: u._id || u.id,   // Ikkalasini ham saqlash
  ...
})
```

#### 6. Socket.IO vs polling
**Muammo:** Mobilda Socket.IO ulanishi ba'zan uziladi.

**Yechim:**
```javascript
transports: ['websocket', 'polling'],  // Fallback polling
pingInterval: 25000,
pingTimeout: 20000
```

---

## 15. KELAJAK REJALARI

### 🚀 Qisqa muddatli (1-3 oy)
- [ ] **Push bildirishnomalar** — FCM (Firebase Cloud Messaging) orqali
- [ ] **To'lov tizimi** — Click / Payme / Uzum Bank integratsiyasi
- [ ] **Geolokatsiya filter** — Yaqin ustalarni ko'rsatish (radius search)
- [ ] **Usta sertifikatlar** — Ko'nikmalarni tasdiqlash tizimi
- [ ] **Baholash tizimi** — Ko'p qirrali (sifat, vaqt, muloqot)

### 🏗️ O'rta muddatli (3-6 oy)
- [ ] **Video call** — WebRTC orqali ish jarayonini nazorat qilish
- [ ] **AI tavsiyalar** — Kategoriya va narx tavsiyasi (ML model)
- [ ] **Korporativ akkaunt** — Kompaniyalar uchun
- [ ] **Statistika dashboard** — Usta uchun batafsil analitika
- [ ] **Ish kalendari** — Ustaning band/bo'sh kunlari

### 🎯 Uzoq muddatli (6-12 oy)
- [ ] **iOS / Android App Store** — EAS build va publish
- [ ] **Multi-shahar** — Toshkent, Samarqand, Buxoro...
- [ ] **Franchise model** — Hududiy operatorlar
- [ ] **Insurance** — Ish kafolati sug'urtasi
- [ ] **B2B API** — Boshqa ilovalar uchun API

### 🔧 Texnik yaxshilanishlar
- [ ] Firebase → Blaze plan (quota cheklovlarsiz)
- [ ] Redis cache — in-memory cache o'rniga
- [ ] TypeScript backend — type safety
- [ ] E2E testlar — Playwright / Detox
- [ ] CI/CD pipeline — GitHub Actions
- [ ] Monitoring — Sentry error tracking
- [ ] Load balancing — Nginx + PM2 cluster

---

## 📊 LOYIHA STATISTIKASI

```
📁 Jami fayllar:          ~120 ta (node_modules siz)
📝 Jami kod satrlari:     ~12,000+
🖥️  Backend endpoints:     35+
📱 Mobil ekranlar:         15 ta
🌐 Web sahifalar:          12 ta
🔌 Socket.IO eventlari:    10+ ta
⏱️  Loyiha davomiyligi:     ~3 oy
👨‍💻 Ishlab chiquvchilar:    1 ta
```

---

## 📞 ALOQA

| | |
|--|--|
| **Platforma** | Ustabozor.uz |
| **GitHub** | github.com/ustabozor |
| **Telegram** | @ustabozor |
| **Email** | info@ustabozor.uz |
| **Web** | https://ustabozor-uz-5wha.vercel.app |

---

*Hisobot avtomatik ravishda Claude Code yordamida yaratilgan. So'nggi yangilanish: 2026-yil mart.*
