import { Chat, Message } from '../types';
import { ApiService } from './api';

export const ChatService = {
    getUserChats: async (userId: string): Promise<Chat[]> => {
        return await ApiService.getUserChats(userId);
    },

    getOrCreateChat: async (userId1: string, userId2: string): Promise<Chat> => {
        return await ApiService.getOrCreateChat(userId1, userId2);
    },

    getChatMessages: async (chatId: string): Promise<Message[]> => {
        return await ApiService.getChatMessages(chatId);
    },

    sendMessage: async (chatId: string, senderId: string, content: string, attachments?: any[]): Promise<Message> => {
        return await ApiService.sendMessage(chatId, senderId, content, attachments);
    },

    markAsRead: async (chatId: string, userId: string): Promise<void> => {
        // Backend implementation needed for this specific logic or we can just ignore for now
        // as it's a simple backend. Or we can add an endpoint.
        // For now, let's skip it to keep it simple or implement if critical.
        // The backend doesn't have markAsRead endpoint yet.
        console.log('markAsRead not implemented in simple backend yet');
    },

    deleteMessage: async (messageId: string): Promise<boolean> => {
        // Backend doesn't have delete endpoint yet
        console.log('deleteMessage not implemented in simple backend yet');
        return true;
    },

    getUnreadCount: async (userId: string): Promise<number> => {
        const chats = await ApiService.getUserChats(userId);
        return chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
    }
};
