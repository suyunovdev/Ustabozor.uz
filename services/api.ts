import { User, Order, Chat, Message, WorkerProfile, Notification } from '../types';

const API_URL = 'http://localhost:5000/api';

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
        isOnline: user.isOnline || false
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
        createdAt: order.createdAt,
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

const transformChat = (chat: any): Chat => {
    if (!chat) return chat;
    return {
        id: chat._id || chat.id,
        participants: chat.participants?.map((p: any) => p._id || p) || [],
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

export const ApiService = {
    // --- AUTH ---
    login: async (email: string, password: string): Promise<User | null> => {
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) return null;
            const data = await res.json();
            return transformUser(data);
        } catch (error) {
            console.error('Login error:', error);
            return null;
        }
    },

    register: async (userData: any): Promise<User | null> => {
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            if (!res.ok) return null;
            const data = await res.json();
            return transformUser(data);
        } catch (error) {
            console.error('Register error:', error);
            return null;
        }
    },

    // --- USERS ---
    getWorkers: async (): Promise<WorkerProfile[]> => {
        const res = await fetch(`${API_URL}/users?role=WORKER`);
        const data = await res.json();
        return data.map(transformWorker);
    },

    getCustomers: async (): Promise<User[]> => {
        const res = await fetch(`${API_URL}/users?role=CUSTOMER`);
        const data = await res.json();
        return data.map(transformUser);
    },

    getAllUsers: async (): Promise<User[]> => {
        const res = await fetch(`${API_URL}/users`);
        const data = await res.json();
        return data.map(transformUser);
    },

    getUserById: async (id: string): Promise<User | undefined> => {
        const res = await fetch(`${API_URL}/users/${id}`);
        if (!res.ok) return undefined;
        const data = await res.json();
        return transformUser(data);
    },

    updateUser: async (id: string, userData: Partial<User> | FormData): Promise<User | null> => {
        const isFormData = userData instanceof FormData;
        const headers: HeadersInit = isFormData ? {} : { 'Content-Type': 'application/json' };
        const body = isFormData ? userData : JSON.stringify(userData);

        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'PUT',
            headers: headers,
            body: body
        });
        if (!res.ok) return null;
        const resData = await res.json();
        return transformUser(resData);
    },

    toggleOnlineStatus: async (id: string): Promise<User | null> => {
        const res = await fetch(`${API_URL}/users/${id}/online`, {
            method: 'PUT'
        });
        if (!res.ok) return null;
        const data = await res.json();
        return transformUser(data);
    },

    // --- ORDERS ---
    getOrders: async (): Promise<Order[]> => {
        const res = await fetch(`${API_URL}/orders`);
        const data = await res.json();
        return data.map(transformOrder);
    },

    createOrder: async (order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });
        const data = await res.json();
        return transformOrder(data);
    },

    updateOrder: async (id: string, orderData: Partial<Order>): Promise<Order | null> => {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        if (!res.ok) return null;
        const resData = await res.json();
        return transformOrder(resData);
    },

    // --- CHATS ---
    getUserChats: async (userId: string): Promise<Chat[]> => {
        const res = await fetch(`${API_URL}/chats?userId=${userId}`);
        const data = await res.json();
        return data.map(transformChat);
    },

    getOrCreateChat: async (userId1: string, userId2: string): Promise<Chat> => {
        const res = await fetch(`${API_URL}/chats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantIds: [userId1, userId2] })
        });
        const data = await res.json();
        return transformChat(data);
    },

    getChatMessages: async (chatId: string): Promise<Message[]> => {
        const res = await fetch(`${API_URL}/messages/${chatId}`);
        const data = await res.json();
        return data.map(transformMessage);
    },

    sendMessage: async (chatId: string, senderId: string, content: string, attachments?: any[]): Promise<Message> => {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, senderId, content, attachments })
        });
        const data = await res.json();
        return transformMessage(data);
    },

    // --- NOTIFICATIONS ---
    getNotifications: async (userId: string): Promise<Notification[]> => {
        const res = await fetch(`${API_URL}/notifications?userId=${userId}`);
        const data = await res.json();
        return data.map(transformNotification);
    },

    markNotificationAsRead: async (id: string): Promise<Notification | null> => {
        const res = await fetch(`${API_URL}/notifications/${id}/read`, {
            method: 'PUT'
        });
        if (!res.ok) return null;
        const data = await res.json();
        return transformNotification(data);
    },

    markAllNotificationsAsRead: async (userId: string): Promise<boolean> => {
        const res = await fetch(`${API_URL}/notifications/read-all?userId=${userId}`, {
            method: 'PUT'
        });
        return res.ok;
    },

    deleteNotification: async (id: string): Promise<boolean> => {
        const res = await fetch(`${API_URL}/notifications/${id}`, {
            method: 'DELETE'
        });
        return res.ok;
    }
};
