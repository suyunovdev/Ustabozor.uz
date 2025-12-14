import { User, Order, WorkerProfile } from '../types';
import { ApiService } from './api';

export const MockService = {
  // Auth Functions
  findUserByPhone: async (phone: string) => {
    // Note: Backend doesn't support findByPhone yet, using getAllUsers as workaround or we can add endpoint
    const users = await ApiService.getAllUsers();
    return users.find(u => u.phone === phone);
  },

  login: async (email: string, password: string) => {
    return await ApiService.login(email, password);
  },

  register: async (userData: any) => {
    return await ApiService.register(userData);
  },

  // User Functions
  getWorkers: async (): Promise<WorkerProfile[]> => {
    return await ApiService.getWorkers();
  },

  getCustomers: async (): Promise<User[]> => {
    return await ApiService.getCustomers();
  },

  getAllUsers: async (): Promise<User[]> => {
    return await ApiService.getAllUsers();
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    return await ApiService.getUserById(id);
  },

  updateUser: async (id: string, data: Partial<User>) => {
    return await ApiService.updateUser(id, data);
  },

  toggleWorkerStatus: async (workerId: string) => {
    const worker = await ApiService.getUserById(workerId) as WorkerProfile;
    if (worker) {
      return await ApiService.updateUser(workerId, { isOnline: !worker.isOnline } as any) as WorkerProfile;
    }
    return null;
  },

  // Order Functions
  getOrders: async (): Promise<Order[]> => {
    return await ApiService.getOrders();
  },

  createOrder: async (order: Omit<Order, 'id' | 'createdAt' | 'status'>) => {
    return await ApiService.createOrder(order);
  },

  acceptOrder: async (orderId: string, workerId: string) => {
    return await ApiService.updateOrder(orderId, { status: 'ACCEPTED', workerId } as any);
  },

  startOrder: async (orderId: string) => {
    return await ApiService.updateOrder(orderId, { status: 'IN_PROGRESS' } as any);
  },

  completeOrder: async (orderId: string) => {
    return await ApiService.updateOrder(orderId, { status: 'COMPLETED' } as any);
  },

  submitReview: async (orderId: string, rating: number, comment: string) => {
    return await ApiService.updateOrder(orderId, {
      review: { rating, comment, createdAt: new Date().toISOString() }
    } as any);
  }
};