
export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  WORKER = 'WORKER',
  ADMIN = 'ADMIN'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Review {
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  surname?: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  balance: number;
  rating?: number;
  ratingCount?: number;
  isOnline?: boolean;
  skills?: string[];
  completedJobs?: number;
  hourlyRate?: number;
  createdAt?: string;
}

export interface WorkerProfile extends User {
  skills: string[];
  hourlyRate: number;
  completedJobs: number;
  isOnline: boolean;
  location: { lat: number; lng: number };
}

export interface Order {
  id: string;
  customerId: string;
  workerId?: string;
  title: string;
  description: string;
  category: string;
  price: number;
  status: OrderStatus;
  location: string;
  lat?: number;  // GPS koordinatalari
  lng?: number;
  createdAt: string;
  acceptedAt?: string;    // Qabul qilingan vaqt
  startedAt?: string;     // Ish boshlangan vaqt
  completedAt?: string;   // Tugatilgan vaqt
  aiSuggested?: boolean;
  review?: Review; // Buyurtma izohi
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'PAYMENT' | 'COMMISSION';
  date: string;
  status: 'SUCCESS' | 'PENDING';
}

// Chat Types
export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ'
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  status: MessageStatus;
  attachments?: {
    name: string;
    url: string;
    type: string;
  }[];
}

export interface Chat {
  id: string;
  participants: string[]; // User IDs
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export enum NotificationType {
  ORDER = 'ORDER',
  MESSAGE = 'MESSAGE',
  SYSTEM = 'SYSTEM',
  PAYMENT = 'PAYMENT'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string; // e.g., orderId or chatId
}
