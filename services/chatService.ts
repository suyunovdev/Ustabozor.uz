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

    markAsRead: async (chatId: string, userId: string): Promise<boolean> => {
        return await ApiService.markChatAsRead(chatId, userId);
    },

    deleteMessage: async (messageId: string): Promise<boolean> => {
        return await ApiService.deleteMessage(messageId);
    },

    getUnreadCount: async (userId: string): Promise<number> => {
        const chats = await ApiService.getUserChats(userId);
        return chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
    },

    clearChat: async (chatId: string): Promise<boolean> => {
        return await ApiService.clearChat(chatId);
    },

    blockUser: async (userId: string, blockedUserId: string): Promise<boolean> => {
        return await ApiService.blockUser(userId, blockedUserId);
    },

    reportUser: async (reporterId: string, reportedUserId: string, reason: string): Promise<boolean> => {
        return await ApiService.reportUser(reporterId, reportedUserId, reason);
    }
};
