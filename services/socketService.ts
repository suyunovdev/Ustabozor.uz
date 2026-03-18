import { io, Socket } from 'socket.io-client';
import { Message } from '../types';

const SOCKET_URL = (import.meta as any).env?.VITE_API_URL
    ? (import.meta as any).env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5000';

type MessageHandler = (message: Message) => void;
type TypingHandler = (data: { userId: string; chatId: string; isTyping: boolean }) => void;
type StatusHandler = (data: { userId: string; isOnline: boolean }) => void;
type ChatUpdatedHandler = (data: { chatId: string }) => void;
type MessageStatusHandler = (data: { messageId: string; status: string }) => void;
type ReadAckHandler = (data: { chatId: string; readBy: string }) => void;

class SocketService {
    private socket: Socket | null = null;
    private userId: string | null = null;

    connect(userId: string) {
        if (this.socket?.connected && this.userId === userId) return;

        this.userId = userId;

        if (this.socket) {
            this.socket.disconnect();
        }

        this.socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 10000,
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket.IO connected:', this.socket?.id);
            this.socket!.emit('user:online', { userId });
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket.IO disconnected:', reason);
        });

        this.socket.on('connect_error', (err) => {
            console.warn('⚠️ Socket.IO connection error:', err.message);
        });

        this.socket.on('reconnect', () => {
            console.log('🔄 Socket.IO reconnected');
            if (this.userId) {
                this.socket!.emit('user:online', { userId: this.userId });
            }
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
        this.userId = null;
    }

    get isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    // ─── CHAT ROOMS ───────────────────────────────────────────────

    joinChat(chatId: string) {
        this.socket?.emit('chat:join', { chatId });
    }

    leaveChat(chatId: string) {
        this.socket?.emit('chat:leave', { chatId });
    }

    // ─── SEND MESSAGE ─────────────────────────────────────────────

    sendMessage(
        chatId: string,
        senderId: string,
        content: string,
        attachments?: any[]
    ): Promise<{ success: boolean; message?: Message; error?: string }> {
        return new Promise((resolve) => {
            if (!this.socket?.connected) {
                resolve({ success: false, error: 'Socket not connected' });
                return;
            }

            const timeout = setTimeout(() => {
                resolve({ success: false, error: 'Timeout' });
            }, 8000);

            this.socket.emit('message:send', { chatId, senderId, content, attachments }, (response: any) => {
                clearTimeout(timeout);
                resolve(response);
            });
        });
    }

    // ─── TYPING ───────────────────────────────────────────────────

    sendTypingStart(chatId: string, userId: string) {
        this.socket?.emit('typing:start', { chatId, userId });
    }

    sendTypingStop(chatId: string, userId: string) {
        this.socket?.emit('typing:stop', { chatId, userId });
    }

    // ─── READ / DELIVERED ─────────────────────────────────────────

    markAsRead(chatId: string, userId: string) {
        this.socket?.emit('messages:read', { chatId, userId });
    }

    markAsDelivered(chatId: string, userId: string) {
        this.socket?.emit('messages:delivered', { chatId, userId });
    }

    // ─── EVENT LISTENERS ──────────────────────────────────────────

    onNewMessage(handler: MessageHandler) {
        this.socket?.on('message:new', handler);
        return () => this.socket?.off('message:new', handler);
    }

    onTyping(handler: TypingHandler) {
        this.socket?.on('typing', handler);
        return () => this.socket?.off('typing', handler);
    }

    onUserStatus(handler: StatusHandler) {
        this.socket?.on('user:status', handler);
        return () => this.socket?.off('user:status', handler);
    }

    onChatUpdated(handler: ChatUpdatedHandler) {
        this.socket?.on('chat:updated', handler);
        return () => this.socket?.off('chat:updated', handler);
    }

    onMessageStatusUpdate(handler: MessageStatusHandler) {
        this.socket?.on('message:status:update', handler);
        return () => this.socket?.off('message:status:update', handler);
    }

    onMessagesReadAck(handler: ReadAckHandler) {
        this.socket?.on('messages:read:ack', handler);
        return () => this.socket?.off('messages:read:ack', handler);
    }

    off(event: string, handler?: (...args: any[]) => void) {
        if (handler) {
            this.socket?.off(event, handler);
        } else {
            this.socket?.removeAllListeners(event);
        }
    }
}

// Singleton
export const socketService = new SocketService();
