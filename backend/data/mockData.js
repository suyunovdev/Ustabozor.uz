// --- IN-MEMORY DATABASE ---

// Users
const users = [
    {
        id: 'w1',
        name: 'Alisher',
        surname: 'Karimov',
        phone: '+998901234567',
        email: 'worker1@mardikor.uz',
        password: 'password123',
        role: 'WORKER',
        balance: 150000,
        rating: 4.8,
        ratingCount: 120,
        skills: ['Santexnika', 'Quvurlar', 'Payvandlash'],
        hourlyRate: 50000,
        completedJobs: 124,
        isOnline: true,
        location: { lat: 41.2995, lng: 69.2401 },
        avatar: 'https://picsum.photos/100/100?random=1'
    },
    {
        id: 'w2',
        name: 'Jasur',
        surname: 'Toshmatov',
        phone: '+998902345678',
        email: 'worker2@mardikor.uz',
        password: 'password123',
        role: 'WORKER',
        balance: 200000,
        rating: 4.9,
        ratingCount: 85,
        skills: ['Elektr', 'Simlar', 'Rozetkalar'],
        hourlyRate: 60000,
        completedJobs: 90,
        isOnline: false,
        location: { lat: 41.3111, lng: 69.2797 },
        avatar: 'https://picsum.photos/100/100?random=2'
    },
    {
        id: 'c1',
        name: 'Botir',
        surname: 'Zakirov',
        phone: '+998998887766',
        email: 'client@mardikor.uz',
        password: 'password123',
        role: 'CUSTOMER',
        balance: 500000,
        rating: 5.0,
        avatar: 'https://picsum.photos/100/100?random=4'
    },
    {
        id: 'c2',
        name: 'Dilnoza',
        surname: 'Rahimova',
        phone: '+998997776655',
        email: 'client2@mardikor.uz',
        password: 'password123',
        role: 'CUSTOMER',
        balance: 300000,
        rating: 4.7,
        avatar: 'https://picsum.photos/100/100?random=5'
    },
    {
        id: 'admin',
        name: 'Admin',
        surname: 'User',
        phone: '+998000000000',
        email: 'admin@mardikor.uz',
        password: 'admin',
        role: 'ADMIN',
        balance: 0,
        avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff'
    }
];

// Orders
let orders = [
    {
        id: 'o1',
        customerId: 'c1',
        title: 'Kran jo\'mragini almashtirish',
        description: 'Oshxonadagi kran suvi oqmayapti, yangisini o\'rnatish kerak.',
        category: 'Santexnika',
        price: 50000,
        location: 'Chilonzor, 19-kvartal',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        coordinates: { lat: 41.2858, lng: 69.2045 }
    },
    {
        id: 'o2',
        customerId: 'c1',
        title: 'Rozetka o\'rnatish',
        description: 'Yangi konditsioner uchun alohida rozetka tortish kerak.',
        category: 'Elektr',
        price: 80000,
        location: 'Yunusobod, 4-kvartal',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        coordinates: { lat: 41.3645, lng: 69.2876 }
    }
];

// Chats
let chats = [];
let messages = [];

// Notifications
let notifications = [
    {
        id: 'n1',
        userId: 'w1',
        type: 'ORDER',
        title: 'Yangi buyurtma',
        message: 'Sizning hududingizda yangi santexnika ishi mavjud.',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        relatedId: 'o1'
    },
    {
        id: 'n2',
        userId: 'w1',
        type: 'PAYMENT',
        title: "To'lov qabul qilindi",
        message: "Sizning hisobingizga 50,000 so'm o'tkazildi.",
        isRead: false,
        createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
        id: 'n3',
        userId: 'w1',
        type: 'SYSTEM',
        title: 'Profilingiz yangilandi',
        message: "Profilingizdagi ma'lumotlar muvaffaqiyatli yangilandi.",
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'n4',
        userId: 'c1',
        type: 'ORDER',
        title: 'Buyurtma qabul qilindi',
        message: "Sizning buyurtmangiz usta tomonidan qabul qilindi.",
        isRead: false,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        relatedId: 'o1'
    },
    {
        id: 'n5',
        userId: 'c1',
        type: 'MESSAGE',
        title: 'Yangi xabar',
        message: 'Alisher Karimov sizga xabar yubordi.',
        isRead: false,
        createdAt: new Date(Date.now() - 600000).toISOString()
    }
];

module.exports = {
    users,
    orders,
    chats,
    messages,
    notifications
};
