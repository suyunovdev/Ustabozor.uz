import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ChatList } from '../components/chat/ChatList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { ChatService } from '../services/chatService';
import { MockService } from '../services/mockDb';
import { Chat, Message, User } from '../types';

export const ChatPage: React.FC = () => {
    const location = useLocation();
    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | undefined>(
        location.state?.selectedChatId
    );
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Get current user from sessionStorage (tab-specific), fallback to localStorage
    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser: User | null = currentUserStr ? JSON.parse(currentUserStr) : null;

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 1000); // Poll every 1 second
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedChatId) {
            loadMessages(selectedChatId);
            // Mark messages as read
            if (currentUser) {
                ChatService.markAsRead(selectedChatId, currentUser.id);
            }

            const interval = setInterval(() => {
                loadMessages(selectedChatId);
            }, 1000); // Poll messages every 1 second

            return () => clearInterval(interval);
        }
    }, [selectedChatId]);

    const loadData = async () => {
        try {
            // Load all users
            const allUsers = await MockService.getAllUsers();
            setUsers(allUsers);

            // Load chats for current user
            if (currentUser) {
                const userChats = await ChatService.getUserChats(currentUser.id);
                // Sort by last message timestamp
                const sortedChats = userChats.sort((a, b) => {
                    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
                    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
                    return bTime - aTime;
                });

                // Check for new messages to play sound
                if (chats.length > 0) {
                    const totalUnread = sortedChats.reduce((sum, c) => sum + c.unreadCount, 0);
                    const prevUnread = chats.reduce((sum, c) => sum + c.unreadCount, 0);
                    if (totalUnread > prevUnread) {
                        playNotificationSound();
                    }
                }

                setChats(sortedChats);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
        toast.info('Yangi xabar keldi! 💬', {
            position: "top-right",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
        });
    };

    const loadMessages = async (chatId: string) => {
        try {
            const chatMessages = await ChatService.getChatMessages(chatId);
            setMessages(chatMessages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSelectChat = (chatId: string) => {
        setSelectedChatId(chatId);
    };

    const handleSendMessage = async (content: string, attachments?: any[]) => {
        if (!selectedChatId || !currentUser) return;

        try {
            await ChatService.sendMessage(selectedChatId, currentUser.id, content, attachments);

            // Reload messages and chats
            await loadMessages(selectedChatId);
            await loadData();
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const getOtherUser = (chat: Chat): User | undefined => {
        if (!currentUser) return undefined;
        const otherUserId = chat.participants.find(id => id !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        return otherUser;
    };

    const selectedChat = chats.find(c => c.id === selectedChatId);
    const otherUser = selectedChat ? getOtherUser(selectedChat) : undefined;

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-center text-gray-500 dark:text-gray-400">
                <h2 className="text-2xl font-bold text-red-500 mb-2">Xatolik</h2>
                <p>Iltimos, tizimga kiring</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-center text-gray-500 dark:text-gray-400">
                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p>Yuklanmoqda...</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] h-[calc(100vh-64px)] bg-white dark:bg-gray-900">
            <div className={`md:block border-r border-gray-200 dark:border-gray-800 ${selectedChatId ? 'hidden' : 'block'}`}>
                <ChatList
                    chats={chats}
                    users={users}
                    currentUserId={currentUser.id}
                    selectedChatId={selectedChatId}
                    onSelectChat={handleSelectChat}
                />
            </div>

            <div className={`md:block h-full overflow-hidden ${selectedChatId ? 'block' : 'hidden'}`}>
                <ChatWindow
                    messages={messages}
                    currentUserId={currentUser.id}
                    otherUser={otherUser}
                    onSendMessage={handleSendMessage}
                    onBack={() => setSelectedChatId(undefined)}
                />
            </div>
        </div>
    );
};
