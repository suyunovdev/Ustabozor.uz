import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import { ApiService } from '../services/api';
import { Chat, Message, MessageStatus, User } from '../types';
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

    // Typing indicators: chatId → Set of userIds
    const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map<string, Set<string>>());

    const prevChatsJsonRef = useRef<string>('');
    const prevMessagesJsonRef = useRef<string>('');
    const isFirstLoadRef = useRef(true);
    const prevUnreadRef = useRef(0);
    const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const chatPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser: User | null = useMemo(() =>
        currentUserStr ? JSON.parse(currentUserStr) : null
        , [currentUserStr]);

    // Extract other user from chat
    const getUserFromChat = useCallback((chat: any): User | undefined => {
        if (!currentUser || !chat.participants) return undefined;
        const otherParticipant = chat.participants.find((p: any) => {
            const pid = p._id || p.id || p;
            return pid !== currentUser.id;
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

    // ─── LOAD CHATS ───────────────────────────────────────────────
    const loadChats = useCallback(async (showLoading = false) => {
        if (!currentUser) return;
        try {
            if (showLoading) setLoading(true);
            const userChats = await ChatService.getUserChats(currentUser.id);

            const sortedChats = userChats.sort((a, b) => {
                const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
                const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
                return bTime - aTime;
            });

            const totalUnread = sortedChats.reduce((sum, c) => sum + c.unreadCount, 0);
            if (!isFirstLoadRef.current && totalUnread > prevUnreadRef.current) {
                playNotificationSound();
            }
            prevUnreadRef.current = totalUnread;
            isFirstLoadRef.current = false;

            // Extract users
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

            const chatsJson = JSON.stringify(sortedChats.map(c =>
                `${c.id}:${c.unreadCount}:${(c.lastMessage as any)?.id || ''}:${(c.lastMessage as any)?.status || ''}`
            ));
            if (chatsJson !== prevChatsJsonRef.current) {
                prevChatsJsonRef.current = chatsJson;
                setChats(sortedChats);
            }
        } catch (error: any) {
            console.error('Error loading chats:', error);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    // ─── LOAD MESSAGES ────────────────────────────────────────────
    const loadMessages = useCallback(async (chatId: string, showLoading = false) => {
        try {
            if (showLoading) setMessagesLoading(true);
            const chatMessages = await ChatService.getChatMessages(chatId);
            const newJson = JSON.stringify(chatMessages.map(m => `${m.id}:${m.status}`));
            if (newJson !== prevMessagesJsonRef.current) {
                prevMessagesJsonRef.current = newJson;
                setMessages(prev => {
                    const remainingTemp = prev
                        .filter(m => m.id.startsWith('temp-'))
                        .filter(temp =>
                            !chatMessages.some(real =>
                                real.content === temp.content &&
                                Math.abs(new Date(real.timestamp).getTime() - new Date(temp.timestamp).getTime()) < 10000
                            )
                        );
                    return [...chatMessages, ...remainingTemp];
                });
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setMessagesLoading(false);
        }
    }, []);

    const playNotificationSound = useCallback(() => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => { });
    }, []);

    // ─── SOCKET SETUP ─────────────────────────────────────────────
    useEffect(() => {
        if (!currentUser) return;

        // Connect socket
        socketService.connect(currentUser.id);

        // Listen: new message
        const offNewMsg = socketService.onNewMessage((message) => {
            if (message.chatId === selectedChatId || (message as any).chatId === selectedChatId) {
                setMessages(prev => {
                    // Temp xabarni o'chirish
                    const withoutTemp = prev.filter(m => !(
                        m.id.startsWith('temp-') &&
                        m.content === message.content &&
                        Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 10000
                    ));
                    // Duplicate tekshirish
                    if (withoutTemp.some(m => m.id === message.id)) return withoutTemp;
                    return [...withoutTemp, message];
                });
                prevMessagesJsonRef.current = '';
            }
            // Chat listni yangilash
            loadChats(false);
            playNotificationSound();
        });

        // Listen: message status update
        const offStatusUpdate = socketService.onMessageStatusUpdate(({ messageId, status }) => {
            setMessages(prev =>
                prev.map(m => m.id === messageId ? { ...m, status: status as any } : m)
            );
        });

        // Listen: messages read ack
        const offReadAck = socketService.onMessagesReadAck(({ chatId }) => {
            if (chatId === selectedChatId) {
                setMessages(prev =>
                    prev.map(m => m.status !== 'READ' ? { ...m, status: 'READ' as any } : m)
                );
            }
            loadChats(false);
        });

        // Listen: typing
        const offTyping = socketService.onTyping(({ userId, chatId, isTyping }) => {
            if (userId === currentUser.id) return;

            // Auto-clear typing timeout
            const key = `${chatId}:${userId}`;
            if (typingTimeoutsRef.current.has(key)) {
                clearTimeout(typingTimeoutsRef.current.get(key)!);
            }

            setTypingUsers(prev => {
                const next = new Map<string, Set<string>>(prev);
                const chatTypers = new Set<string>(next.get(chatId) ?? []);
                if (isTyping) {
                    chatTypers.add(userId);
                    const timeout = setTimeout(() => {
                        setTypingUsers(p => {
                            const n = new Map<string, Set<string>>(p);
                            const t = new Set<string>(n.get(chatId) ?? []);
                            t.delete(userId);
                            n.set(chatId, t);
                            return n;
                        });
                    }, 5000);
                    typingTimeoutsRef.current.set(key, timeout);
                } else {
                    chatTypers.delete(userId);
                    typingTimeoutsRef.current.delete(key);
                }
                next.set(chatId, chatTypers);
                return next;
            });
        });

        // Listen: user online/offline status
        const offUserStatus = socketService.onUserStatus(({ userId, isOnline }) => {
            setUsers(prev => {
                const next = new Map(prev);
                const user = next.get(userId);
                if (user) next.set(userId, { ...(user as any), isOnline } as User);
                return next;
            });
            setChats(prev => prev.map(chat => {
                if (!(chat as any).participants) return chat;
                return {
                    ...(chat as any),
                    participants: ((chat as any).participants as any[]).map((p: any) => {
                        const pid = p._id || p.id || p;
                        if (pid === userId) return { ...p, isOnline };
                        return p;
                    })
                } as Chat;
            }));
        });

        // Listen: chat updated (new message in other chat)
        const offChatUpdated = socketService.onChatUpdated(() => {
            loadChats(false);
        });

        return () => {
            offNewMsg();
            offStatusUpdate();
            offReadAck();
            offTyping();
            offUserStatus();
            offChatUpdated();
        };
    }, [currentUser, selectedChatId, loadChats, playNotificationSound]);

    // ─── INITIAL LOAD + FALLBACK POLLING ─────────────────────────
    useEffect(() => {
        loadChats(true);

        // Fallback polling (30s) agar socket ishlamasa
        chatPollingRef.current = setInterval(() => {
            if (!socketService.isConnected) {
                loadChats(false);
            }
        }, 30000);

        return () => {
            if (chatPollingRef.current) clearInterval(chatPollingRef.current);
        };
    }, [loadChats]);

    // ─── SELECTED CHAT ────────────────────────────────────────────
    useEffect(() => {
        if (!selectedChatId || !currentUser) return;

        loadMessages(selectedChatId, true);
        prevMessagesJsonRef.current = '';

        socketService.joinChat(selectedChatId);
        socketService.markAsDelivered(selectedChatId, currentUser.id);
        socketService.markAsRead(selectedChatId, currentUser.id);

        // HTTP fallback (agar socket yo'q bo'lsa)
        ChatService.markAsRead(selectedChatId, currentUser.id).catch(() => { });

        // Fallback polling for messages (10s)
        const interval = setInterval(() => {
            if (!socketService.isConnected) {
                loadMessages(selectedChatId, false);
            }
        }, 10000);

        return () => {
            clearInterval(interval);
            socketService.leaveChat(selectedChatId);
        };
    }, [selectedChatId, currentUser, loadMessages]);

    // ─── HANDLERS ─────────────────────────────────────────────────
    const handleSelectChat = useCallback((chatId: string) => {
        if (selectedChatId) socketService.leaveChat(selectedChatId);
        setSelectedChatId(chatId);
        setMessages([]);
        prevMessagesJsonRef.current = '';
    }, [selectedChatId]);

    const handleSendMessage = useCallback(async (content: string, attachments?: any[]) => {
        if (!selectedChatId || !currentUser) return;

        // Optimistic update
        const tempMessage: Message = {
            id: `temp-${Date.now()}`,
            chatId: selectedChatId,
            senderId: currentUser.id,
            content,
            timestamp: new Date().toISOString(),
            status: MessageStatus.SENT,
            attachments
        };
        setMessages(prev => [...prev, tempMessage]);

        try {
            if (socketService.isConnected) {
                // Socket orqali yuborish
                const result = await socketService.sendMessage(selectedChatId, currentUser.id, content, attachments);
                if (!result.success) {
                    // Fallback: HTTP
                    await ChatService.sendMessage(selectedChatId, currentUser.id, content, attachments);
                }
            } else {
                // HTTP fallback
                await ChatService.sendMessage(selectedChatId, currentUser.id, content, attachments);
            }

            prevMessagesJsonRef.current = '';
            await loadMessages(selectedChatId, false);
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Xabar yuborishda xatolik');
            setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
        }
    }, [selectedChatId, currentUser, loadMessages]);

    const handleTypingStart = useCallback(() => {
        if (!selectedChatId || !currentUser) return;
        socketService.sendTypingStart(selectedChatId, currentUser.id);
    }, [selectedChatId, currentUser]);

    const handleTypingStop = useCallback(() => {
        if (!selectedChatId || !currentUser) return;
        socketService.sendTypingStop(selectedChatId, currentUser.id);
    }, [selectedChatId, currentUser]);

    // Get other user from selected chat
    const otherUser = useMemo(() => {
        if (!selectedChatId || !currentUser) return undefined;
        const selectedChat = chats.find(c => c.id === selectedChatId);
        if (!selectedChat) return undefined;
        return getUserFromChat(selectedChat);
    }, [selectedChatId, currentUser, chats, getUserFromChat]);

    // Typing users for current chat
    const isOtherUserTyping = useMemo(() => {
        if (!selectedChatId || !otherUser) return false;
        const typers = typingUsers.get(selectedChatId);
        return typers ? typers.has(otherUser.id) : false;
    }, [selectedChatId, otherUser, typingUsers]);

    const usersArray = useMemo(() => Array.from(users.values()), [users]);

    // Not logged in
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

    if (loading) {
        return (
            <div className="flex flex-col h-[calc(100dvh-4rem)]">
                <ChatSkeleton />
            </div>
        );
    }

    if (selectedChatId && otherUser) {
        return (
            <div className="flex flex-col h-[calc(100dvh-4rem)]">
                <ChatWindow
                    chatId={selectedChatId}
                    messages={messages}
                    currentUserId={currentUser.id}
                    otherUser={otherUser}
                    onSendMessage={handleSendMessage}
                    onBack={() => setSelectedChatId(undefined)}
                    isOtherUserTyping={isOtherUserTyping}
                    onTypingStart={handleTypingStart}
                    onTypingStop={handleTypingStop}
                />
            </div>
        );
    }

    if (chats.length === 0) {
        return (
            <div className="flex flex-col h-[calc(100dvh-4rem)]">
                <EmptyChats />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100dvh-4rem)]">
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
