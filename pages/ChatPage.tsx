import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatService } from '../services/chatService';
import { Chat, Message, User } from '../types';
import { MessageSquare } from 'lucide-react';

// Skeleton Loading Component
const ChatSkeleton: React.FC = () => (
    <div className="flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 overflow-y-auto">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                    <div className="flex-1">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                        <div className="h-3 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Empty State Component
const EmptyChats: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
            <MessageSquare className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Hozircha xabarlar yo'q</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
            Ish beruvchilar yoki ishchilar bilan bog'laning va suhbat boshlang
        </p>
    </div>
);

// Optimized Chat Page with caching, skeleton loading, and progressive updates
export const ChatPage: React.FC = () => {
    const location = useLocation();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | undefined>(
        location.state?.selectedChatId
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<Map<string, User>>(new Map());
    const [loading, setLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(false);

    // Refs for tracking state without re-renders
    const prevUnreadRef = useRef(0);
    const isFirstLoadRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser: User | null = useMemo(() =>
        currentUserStr ? JSON.parse(currentUserStr) : null
        , [currentUserStr]);

    // Extract user from populated chat data
    const getUserFromChat = useCallback((chat: any): User | undefined => {
        if (!currentUser || !chat.participants) return undefined;

        const otherParticipant = chat.participants.find((p: any) => {
            const participantId = p._id || p.id || p;
            return participantId !== currentUser.id;
        });

        if (otherParticipant && typeof otherParticipant === 'object') {
            return {
                id: otherParticipant._id || otherParticipant.id,
                name: otherParticipant.name,
                surname: otherParticipant.surname,
                avatar: otherParticipant.avatar,
                role: otherParticipant.role,
                isOnline: otherParticipant.isOnline
            } as User;
        }

        return undefined;
    }, [currentUser]);

    // Optimized chat loader with abort controller
    const loadChats = useCallback(async (showLoading = false) => {
        if (!currentUser) return;

        // Cancel previous request if still pending
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            if (showLoading) setLoading(true);

            const startTime = performance.now();
            const userChats = await ChatService.getUserChats(currentUser.id);
            console.log(`📨 Chats loaded in ${(performance.now() - startTime).toFixed(0)}ms`);

            // Sort by last message time
            const sortedChats = userChats.sort((a, b) => {
                const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
                const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
                return bTime - aTime;
            });

            // Calculate unread for notification
            const totalUnread = sortedChats.reduce((sum, c) => sum + c.unreadCount, 0);

            // Play sound only if new unread messages and not first load
            if (!isFirstLoadRef.current && totalUnread > prevUnreadRef.current) {
                playNotificationSound();
            }

            prevUnreadRef.current = totalUnread;
            isFirstLoadRef.current = false;

            // Extract users from populated chat data
            const userMap = new Map<string, User>();
            sortedChats.forEach((chat: any) => {
                if (chat.participants) {
                    chat.participants.forEach((p: any) => {
                        if (typeof p === 'object' && (p._id || p.id)) {
                            const id = p._id || p.id;
                            userMap.set(id, {
                                id,
                                name: p.name,
                                surname: p.surname,
                                avatar: p.avatar,
                                role: p.role,
                                isOnline: p.isOnline
                            } as User);
                        }
                    });
                }
            });

            setUsers(userMap);
            setChats(sortedChats);
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error('Error loading chats:', error);
            }
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // Load messages for selected chat with loading state
    const loadMessages = useCallback(async (chatId: string, showLoading = false) => {
        try {
            if (showLoading) setMessagesLoading(true);
            const startTime = performance.now();
            const chatMessages = await ChatService.getChatMessages(chatId);
            console.log(`💬 Messages loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
            setMessages(chatMessages);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    }, []);

    const playNotificationSound = useCallback(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => { });
        toast.info('Yangi xabar keldi! 💬', { position: "top-right", autoClose: 2000 });
    }, []);

    // Initial load
    useEffect(() => {
        loadChats(true);

        // Polling interval - 5 seconds for chat list
        const interval = setInterval(() => loadChats(false), 5000);

        return () => {
            clearInterval(interval);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadChats]);

    // Load messages when chat is selected
    useEffect(() => {
        if (selectedChatId && currentUser) {
            loadMessages(selectedChatId, true);

            // Mark as read (fire and forget)
            ChatService.markAsRead(selectedChatId, currentUser.id).catch(() => { });

            // Polling for messages - 3 seconds
            const interval = setInterval(() => {
                loadMessages(selectedChatId, false);
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [selectedChatId, currentUser, loadMessages]);

    const handleSelectChat = useCallback((chatId: string) => {
        setSelectedChatId(chatId);
        setMessages([]); // Clear messages immediately for fresh load
    }, []);

    const handleSendMessage = useCallback(async (content: string, attachments?: any[]) => {
        if (!selectedChatId || !currentUser) return;

        try {
            // Optimistic update - immediately show message
            const tempMessage: Message = {
                id: `temp-${Date.now()}`,
                chatId: selectedChatId,
                senderId: currentUser.id,
                content,
                timestamp: new Date().toISOString(),
                status: 'SENT',
                attachments
            };
            setMessages(prev => [...prev, tempMessage]);

            // Send to server
            await ChatService.sendMessage(selectedChatId, currentUser.id, content, attachments);

            // Load actual messages
            await loadMessages(selectedChatId, false);
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error("Xabar yuborishda xatolik");
            // Remove optimistic update on error
            setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        }
    }, [selectedChatId, currentUser, loadMessages]);

    // Get other user from selected chat
    const otherUser = useMemo(() => {
        if (!selectedChatId || !currentUser) return undefined;
        const selectedChat = chats.find(c => c.id === selectedChatId);
        if (!selectedChat) return undefined;
        return getUserFromChat(selectedChat);
    }, [selectedChatId, currentUser, chats, getUserFromChat]);

    // Convert users Map to array for ChatList
    const usersArray = useMemo(() => Array.from(users.values()), [users]);

    // Not logged in state
    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] text-center px-6">
                <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl">
                    <span className="text-4xl">🔒</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Tizimga kiring</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Xabarlarni ko'rish uchun login qiling</p>
            </div>
        );
    }

    // Loading skeleton
    if (loading) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)]">
                <ChatSkeleton />
            </div>
        );
    }

    // Chat window view
    if (selectedChatId && otherUser) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)]">
                <ChatWindow
                    chatId={selectedChatId}
                    messages={messages}
                    currentUserId={currentUser.id}
                    otherUser={otherUser}
                    onSendMessage={handleSendMessage}
                    onBack={() => setSelectedChatId(undefined)}
                />
            </div>
        );
    }

    // Empty state
    if (chats.length === 0) {
        return (
            <div className="flex flex-col h-[calc(100vh-64px)]">
                <EmptyChats />
            </div>
        );
    }

    // Chat list view
    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            <ChatList
                chats={chats}
                users={usersArray}
                currentUserId={currentUser.id}
                selectedChatId={selectedChatId}
                onSelectChat={handleSelectChat}
            />
        </div>
    );
};
