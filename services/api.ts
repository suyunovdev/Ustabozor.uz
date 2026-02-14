import { User, Order, Chat, Message, WorkerProfile, Notification } from '../types';

// Production uchun Render URL, development uchun localhost
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

// Transform functions to convert MongoDB format to frontend format
const transformUser = (user: any): User => {
    if (!user) return user;
    return {
        id: user._id || user.id,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        balance: user.balance || 0,
        rating: user.rating,
        ratingCount: user.ratingCount,
        isOnline: user.isOnline || false,
        skills: user.skills || [],
        completedJobs: user.completedJobs || 0,
        hourlyRate: user.hourlyRate || 0,
        createdAt: user.createdAt,
        isBanned: user.isBanned || false,
        blockReason: user.blockReason,
        blockedUntil: user.blockedUntil,
        blockedAt: user.blockedAt
    };
};

const transformWorker = (worker: any): WorkerProfile => {
    if (!worker) return worker;
    return {
        ...transformUser(worker),
        skills: worker.skills || [],
        hourlyRate: worker.hourlyRate || 0,
        completedJobs: worker.completedJobs || 0,
        isOnline: worker.isOnline || false,
        location: worker.location || { lat: 0, lng: 0 }
    } as WorkerProfile;
};

const transformOrder = (order: any): Order => {
    if (!order) return order;
    return {
        id: order._id || order.id,
        customerId: order.customerId?._id || order.customerId,
        workerId: order.workerId?._id || order.workerId,
        title: order.title,
        description: order.description,
        category: order.category,
        price: order.price,
        status: order.status,
        location: order.location,
        lat: order.lat,  // GPS koordinatasi - kenglik
        lng: order.lng,  // GPS koordinatasi - uzunlik
        createdAt: order.createdAt,
        acceptedAt: order.acceptedAt,
        startedAt: order.startedAt,
        completedAt: order.completedAt,
        aiSuggested: order.aiSuggested,
        review: order.review
    };
};

const transformMessage = (msg: any): Message => {
    if (!msg) return msg;
    return {
        id: msg._id || msg.id,
        chatId: msg.chatId?._id || msg.chatId,
        senderId: msg.senderId?._id || msg.senderId,
        content: msg.content,
        timestamp: msg.createdAt || msg.timestamp || new Date().toISOString(),
        status: msg.status || 'SENT',
        attachments: msg.attachments
    };
};

const transformChat = (chat: any): Chat & { participants: any[] } => {
    if (!chat) return chat;
    return {
        id: chat._id || chat.id,
        // Keep full participant objects if populated, otherwise just IDs
        participants: chat.participants?.map((p: any) => {
            if (typeof p === 'object' && (p._id || p.id)) {
                return {
                    _id: p._id || p.id,
                    id: p._id || p.id,
                    name: p.name,
                    surname: p.surname,
                    avatar: p.avatar,
                    role: p.role,
                    isOnline: p.isOnline
                };
            }
            return p;
        }) || [],
        lastMessage: chat.lastMessage ? transformMessage(chat.lastMessage) : undefined,
        unreadCount: chat.unreadCount || 0,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
    };
};

const transformNotification = (notif: any): Notification => {
    if (!notif) return notif;
    return {
        id: notif._id || notif.id,
        userId: notif.userId?._id || notif.userId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: notif.isRead || false,
        createdAt: notif.createdAt,
        relatedId: notif.relatedId?._id || notif.relatedId
    };
};

// --- CACHE SYSTEM ---
const localCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

const getCachedData = (key: string) => {
    const cached = localCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
};

const setCachedData = (key: string, data: any) => {
    localCache.set(key, { data, timestamp: Date.now() });
};

// --- JWT TOKEN ---
const getToken = (): string | null => {
    return localStorage.getItem('authToken');
};

export const setToken = (token: string | null) => {
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
};

// --- REQUEST HELPER ---
async function request<T>(path: string, options: RequestInit = {}, useCache = false): Promise<T> {
    const url = `${API_URL}${path}`;
    const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.body || '')}`;

    if (useCache && (!options.method || options.method === 'GET')) {
        const cached = getCachedData(cacheKey);
        if (cached) return cached;
    }

    const token = getToken();
    try {
        const res = await fetch(url, {
            ...options,
            headers: {
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
        });

        if (!res.ok) {
            let errorMessage = `Request failed with status ${res.status}`;
            try {
                const errorData = await res.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Not a JSON error
            }
            throw new Error(errorMessage);
        }

        const data = await res.json();
        if (useCache) setCachedData(cacheKey, data);
        return data;
    } catch (error) {
        console.error(`API Request Error [${path}]:`, error);
        throw error;
    }
}

export const ApiService = {
    // --- AUTH ---
    login: async (email: string, password: string): Promise<User> => {
        const data = await request<any>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.token) setToken(data.token);
        return transformUser(data);
    },

    register: async (userData: any): Promise<User> => {
        const data = await request<any>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        if (data.token) setToken(data.token);
        return transformUser(data);
    },

    // --- USERS ---
    getWorkers: async (): Promise<WorkerProfile[]> => {
        try {
            const data = await request<any[]>('/users?role=WORKER', {}, true);
            return data.map(transformWorker);
        } catch (error) {
            return [];
        }
    },

    getCustomers: async (): Promise<User[]> => {
        try {
            const data = await request<any[]>('/users?role=CUSTOMER', {}, true);
            return data.map(transformUser);
        } catch (error) {
            return [];
        }
    },

    getAllUsers: async (): Promise<User[]> => {
        try {
            const data = await request<any[]>('/users', {}, true);
            return data.map(transformUser);
        } catch (error) {
            return [];
        }
    },

    getUserById: async (id: string): Promise<User | undefined> => {
        try {
            const data = await request<any>(`/users/${id}`, {}, true);
            return transformUser(data);
        } catch (error) {
            return undefined;
        }
    },

    updateUser: async (id: string, userData: Partial<User> | FormData): Promise<User | null> => {
        try {
            const isFormData = userData instanceof FormData;
            const data = await request<any>(`/users/${id}`, {
                method: 'PUT',
                body: isFormData ? userData : JSON.stringify(userData)
            });
            // Clear cache for this user
            localCache.delete(`GET:${API_URL}/users/${id}:{}`);
            return transformUser(data);
        } catch (error) {
            return null;
        }
    },

    toggleOnlineStatus: async (id: string): Promise<User | null> => {
        try {
            const data = await request<any>(`/users/${id}/online`, { method: 'PUT' });
            return transformUser(data);
        } catch (error) {
            return null;
        }
    },

    // --- ORDERS ---
    getOrders: async (): Promise<Order[]> => {
        try {
            const data = await request<any[]>('/orders', {}, true);
            return data.map(transformOrder);
        } catch (error) {
            return [];
        }
    },

    createOrder: async (order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
        const data = await request<any>('/orders', {
            method: 'POST',
            body: JSON.stringify(order)
        });
        // Invalidate orders cache
        localCache.forEach((_, key) => {
            if (key.includes('/orders')) localCache.delete(key);
        });
        return transformOrder(data);
    },

    updateOrder: async (id: string, orderData: Partial<Order>): Promise<Order | null> => {
        try {
            const data = await request<any>(`/orders/${id}`, {
                method: 'PUT',
                body: JSON.stringify(orderData)
            });
            return transformOrder(data);
        } catch (error) {
            return null;
        }
    },

    deleteOrder: async (id: string): Promise<boolean> => {
        try {
            await request(`/orders/${id}`, { method: 'DELETE' });
            return true;
        } catch (error) {
            return false;
        }
    },

    // --- CHATS ---
    getUserChats: async (userId: string): Promise<Chat[]> => {
        try {
            const data = await request<any[]>(`/chats?userId=${userId}`, {}, true);
            return data.map(transformChat);
        } catch (error) {
            return [];
        }
    },

    getOrCreateChat: async (userId1: string, userId2: string): Promise<Chat> => {
        const data = await request<any>('/chats', {
            method: 'POST',
            body: JSON.stringify({ participantIds: [userId1, userId2] })
        });
        return transformChat(data);
    },

    getChatMessages: async (chatId: string): Promise<Message[]> => {
        try {
            const data = await request<any[]>(`/messages/${chatId}`);
            return data.map(transformMessage);
        } catch (error) {
            return [];
        }
    },

    sendMessage: async (chatId: string, senderId: string, content: string, attachments?: any[]): Promise<Message> => {
        console.log('📤 Sending message with attachments:', attachments);
        const data = await request<any>('/messages', {
            method: 'POST',
            body: JSON.stringify({ chatId, senderId, content, attachments })
        });
        return transformMessage(data);
    },

    deleteMessage: async (messageId: string): Promise<boolean> => {
        try {
            await request(`/messages/${messageId}`, { method: 'DELETE' });
            return true;
        } catch (error) {
            return false;
        }
    },

    markChatAsRead: async (chatId: string, userId: string): Promise<boolean> => {
        try {
            await request(`/chats/${chatId}/read`, {
                method: 'PUT',
                body: JSON.stringify({ userId })
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    markMessagesDelivered: async (chatId: string, userId: string): Promise<boolean> => {
        try {
            await request('/messages/deliver', {
                method: 'PUT',
                body: JSON.stringify({ chatId, userId })
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    // --- NOTIFICATIONS ---
    getNotifications: async (userId: string): Promise<Notification[]> => {
        try {
            const data = await request<any[]>(`/notifications?userId=${userId}`);
            return data.map(transformNotification);
        } catch (error) {
            return [];
        }
    },

    markNotificationAsRead: async (id: string): Promise<Notification | null> => {
        try {
            const data = await request<any>(`/notifications/${id}/read`, { method: 'PUT' });
            return transformNotification(data);
        } catch (error) {
            return null;
        }
    },

    markAllNotificationsAsRead: async (userId: string): Promise<boolean> => {
        try {
            await request(`/notifications/read-all?userId=${userId}`, { method: 'PUT' });
            return true;
        } catch (error) {
            return false;
        }
    },

    deleteNotification: async (id: string): Promise<boolean> => {
        try {
            await request(`/notifications/${id}`, { method: 'DELETE' });
            return true;
        } catch (error) {
            return false;
        }
    },

    // --- USER DELETE ---
    deleteUser: async (id: string): Promise<boolean> => {
        try {
            await request(`/users/${id}`, { method: 'DELETE' });
            return true;
        } catch (error) {
            return false;
        }
    },

    // --- UPLOAD ---
    uploadFile: async (file: File): Promise<{ name: string; url: string; type: string } | null> => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            return await request<any>('/upload', {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            return null;
        }
    },

    // --- NEW ACTIONS ---
    clearChat: async (chatId: string): Promise<boolean> => {
        try {
            await request(`/chats/${chatId}/messages`, { method: 'DELETE' });
            return true;
        } catch (error) {
            return false;
        }
    },

    blockUser: async (userId: string, blockedUserId: string): Promise<boolean> => {
        try {
            await request(`/users/${userId}/block`, {
                method: 'POST',
                body: JSON.stringify({ blockedUserId })
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    // Admin ban/unban user
    // Heartbeat — foydalanuvchi tirik ekanligini bildiradi
    sendHeartbeat: async (userId: string): Promise<void> => {
        try {
            await request(`/users/${userId}/heartbeat`, { method: 'POST' });
        } catch (error) {
            // Silent fail
        }
    },

    // Offline qilish
    goOffline: async (userId: string): Promise<void> => {
        try {
            await request(`/users/${userId}/offline`, { method: 'POST' });
        } catch (error) {
            // Silent fail
        }
    },

    banUser: async (userId: string, data: { action: 'ban' | 'unban'; reason?: string; duration?: string }): Promise<any> => {
        return await request(`/users/${userId}/ban`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    reportUser: async (reporterId: string, reportedUserId: string, reason: string): Promise<boolean> => {
        try {
            await request('/reports', {
                method: 'POST',
                body: JSON.stringify({ reporterId, reportedUserId, reason })
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    // --- TELEGRAM AUTH ---
    telegramAuth: async (initData: string): Promise<any> => {
        return await request<any>('/telegram/auth', {
            method: 'POST',
            body: JSON.stringify({ initData })
        });
    },

    telegramRegister: async (initData: string, role: string, phone?: string, skills?: string[], hourlyRate?: number): Promise<any> => {
        return await request<any>('/telegram/register', {
            method: 'POST',
            body: JSON.stringify({ initData, role, phone, skills, hourlyRate })
        });
    },

    telegramLink: async (initData: string, email: string, password: string): Promise<any> => {
        return await request<any>('/telegram/link', {
            method: 'POST',
            body: JSON.stringify({ initData, email, password })
        });
    }
};

