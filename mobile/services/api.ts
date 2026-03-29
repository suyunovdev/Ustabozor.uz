import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants';

// ─── Types ────────────────────────────────────────────────────────────────────
export enum UserRole { CUSTOMER = 'CUSTOMER', WORKER = 'WORKER', ADMIN = 'ADMIN' }
export enum OrderStatus { PENDING = 'PENDING', ACCEPTED = 'ACCEPTED', IN_PROGRESS = 'IN_PROGRESS', COMPLETED = 'COMPLETED', CANCELLED = 'CANCELLED' }
export enum MessageStatus { SENT = 'SENT', DELIVERED = 'DELIVERED', READ = 'READ' }

export interface User {
  _id: string; id: string; name: string; surname?: string; phone: string; email?: string;
  role: UserRole; avatar?: string; balance: number; rating?: number;
  ratingCount?: number; isOnline?: boolean; skills?: string[];
  completedJobs?: number; hourlyRate?: number; createdAt?: string; isBanned?: boolean;
}
export interface Order {
  id: string; customerId: string; workerId?: string; title: string;
  description: string; category: string; price: number; status: OrderStatus;
  location: string; lat?: number; lng?: number; createdAt: string;
  acceptedAt?: string; startedAt?: string; completedAt?: string;
  review?: { rating: number; comment: string; createdAt: string };
  customer?: User; worker?: User;
}
export interface Message {
  id: string; chatId: string; senderId: string; content: string;
  timestamp: string; status: MessageStatus;
  attachments?: { name: string; url: string; type: string }[];
}
export interface Chat {
  id: string; participants: string[]; lastMessage?: Message;
  unreadCount: number; createdAt: string; updatedAt: string;
  otherUser?: User;
}
export interface Notification {
  id: string; userId: string; title: string; body: string;
  type: string; isRead: boolean; createdAt: string; data?: any;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
const transformUser = (u: any): User => ({
  _id: u._id || u.id, id: u._id || u.id, name: u.name, surname: u.surname, phone: u.phone,
  email: u.email, role: u.role, avatar: u.avatar, balance: u.balance || 0,
  rating: u.rating, ratingCount: u.ratingCount, isOnline: u.isOnline || false,
  skills: u.skills || [], completedJobs: u.completedJobs || 0,
  hourlyRate: u.hourlyRate || 0, createdAt: u.createdAt, isBanned: u.isBanned || false,
});
const transformOrder = (o: any): Order => ({
  id: o._id || o.id, customerId: o.customerId?._id || o.customerId,
  workerId: o.workerId?._id || o.workerId, title: o.title,
  description: o.description, category: o.category, price: o.price,
  status: o.status, location: o.location, lat: o.lat, lng: o.lng,
  createdAt: o.createdAt, acceptedAt: o.acceptedAt, startedAt: o.startedAt,
  completedAt: o.completedAt, review: o.review,
  customer: o.customerId?.name ? transformUser(o.customerId) : undefined,
  worker: o.workerId?.name ? transformUser(o.workerId) : undefined,
});

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('token');
  const isFormData = options.body instanceof FormData;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000); // 15s timeout

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        // FormData bo'lsa Content-Type o'rnatilmaydi — RN o'zi boundary qo'shadi
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
    return data;
  } catch (e: any) {
    if (e.name === 'AbortError') throw new Error('Server bilan aloqa yo\'q (timeout)');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const AuthAPI = {
  login: async (email: string, password: string) => {
    const data: any = await request('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    const user = transformUser(data);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return { token: data.token, user };
  },
  register: async (payload: { name: string; surname: string; phone: string; email: string; password: string; role: UserRole }) => {
    const data: any = await request('/auth/register', {
      method: 'POST', body: JSON.stringify(payload),
    });
    const user = transformUser(data);
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return { token: data.token, user };
  },
  logout: async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
  },
  getStoredUser: async (): Promise<User | null> => {
    const raw = await AsyncStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const UsersAPI = {
  getById: async (id: string): Promise<User> => {
    const data: any = await request(`/users/${id}`);
    return transformUser(data);
  },
  getWorkers: async (): Promise<User[]> => {
    const data: any = await request('/users/workers');
    return Array.isArray(data) ? data.map(transformUser) : [];
  },
  updateProfile: async (id: string, payload: FormData): Promise<User> => {
    const token = await AsyncStorage.getItem('token');
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: payload,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    const user = transformUser(data);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user;
  },
  registerPushToken: async (userId: string, token: string) => {
    await request(`/users/${userId}/push-token`, {
      method: 'POST', body: JSON.stringify({ token }),
    });
  },
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const OrdersAPI = {
  getAll: async (params?: Record<string, string>): Promise<Order[]> => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const data: any = await request(`/orders${qs}`);
    return Array.isArray(data) ? data.map(transformOrder) : [];
  },
  getById: async (id: string): Promise<Order> => {
    const data: any = await request(`/orders/${id}`);
    return transformOrder(data);
  },
  create: async (payload: Partial<Order>): Promise<Order> => {
    const data: any = await request('/orders', { method: 'POST', body: JSON.stringify(payload) });
    return transformOrder(data);
  },
  update: async (id: string, payload: any): Promise<Order> => {
    const data: any = await request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return transformOrder(data);
  },
  getByCustomer: async (customerId: string): Promise<Order[]> => {
    const data: any = await request(`/orders?customerId=${customerId}`);
    return Array.isArray(data) ? data.map(transformOrder) : [];
  },
  getAvailableForWorker: async (): Promise<Order[]> => {
    const data: any = await request('/orders?status=PENDING');
    return Array.isArray(data) ? data.map(transformOrder) : [];
  },
  getByWorker: async (workerId: string): Promise<Order[]> => {
    const data: any = await request(`/orders?workerId=${workerId}`);
    return Array.isArray(data) ? data.map(transformOrder) : [];
  },
  submitReview: async (orderId: string, rating: number, comment: string): Promise<Order> => {
    const data: any = await request(`/orders/${orderId}/review`, {
      method: 'POST', body: JSON.stringify({ rating, comment }),
    });
    return transformOrder(data);
  },
  cancel: async (orderId: string): Promise<Order> => {
    const data: any = await request(`/orders/${orderId}`, {
      method: 'PUT', body: JSON.stringify({ status: 'CANCELLED' }),
    });
    return transformOrder(data);
  },
};

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const ChatAPI = {
  getChats: async (userId: string): Promise<Chat[]> => {
    const data: any = await request(`/chats?userId=${userId}`);
    return Array.isArray(data) ? data : [];
  },
  getMessages: async (chatId: string): Promise<Message[]> => {
    const data: any = await request(`/chats/${chatId}/messages`);
    return Array.isArray(data) ? data : [];
  },
  sendMessage: async (chatId: string, senderId: string, content: string): Promise<Message> => {
    return request(`/chats/${chatId}/messages`, {
      method: 'POST', body: JSON.stringify({ senderId, content }),
    });
  },
  createOrGet: async (userId1: string, userId2: string): Promise<Chat> => {
    return request('/chats', { method: 'POST', body: JSON.stringify({ participants: [userId1, userId2] }) });
  },
  markAsRead: async (chatId: string, userId: string) => {
    await request(`/chats/${chatId}/read`, { method: 'POST', body: JSON.stringify({ userId }) });
  },
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const NotificationsAPI = {
  getAll: async (userId: string): Promise<Notification[]> => {
    const data: any = await request(`/notifications?userId=${userId}`);
    return Array.isArray(data) ? data : [];
  },
  markAsRead: async (notifId: string) => {
    await request(`/notifications/${notifId}/read`, { method: 'POST' });
  },
  markAllAsRead: async (userId: string) => {
    await request(`/notifications/read-all`, { method: 'POST', body: JSON.stringify({ userId }) });
  },
};
