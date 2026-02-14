import React, { useState, useEffect } from 'react';
import { Notification, NotificationType } from '../types';
import { ApiService } from '../services/api';
import { X, Bell, BellOff, Check, CheckCheck, Trash2, Package, MessageSquare, Settings, CreditCard, Filter } from 'lucide-react';

interface NotificationsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose, userId }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && userId) {
            fetchNotifications();
        }
    }, [isOpen, userId]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const data = await ApiService.getNotifications(userId);
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        await ApiService.markNotificationAsRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const handleMarkAllAsRead = async () => {
        await ApiService.markAllNotificationsAsRead(userId);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const handleDelete = async (id: string) => {
        await ApiService.deleteNotification(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.ORDER: return <Package size={20} className="text-blue-500" />;
            case NotificationType.MESSAGE: return <MessageSquare size={20} className="text-green-500" />;
            case NotificationType.PAYMENT: return <CreditCard size={20} className="text-purple-500" />;
            case NotificationType.SYSTEM: return <Settings size={20} className="text-gray-500" />;
            default: return <Bell size={20} className="text-gray-500" />;
        }
    };

    const getTimeAgo = (dateString: string) => {
        const now = new Date();
        const date = new Date(dateString);
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Hozirgina";
        if (minutes < 60) return `${minutes} daqiqa oldin`;
        if (hours < 24) return `${hours} soat oldin`;
        return `${days} kun oldin`;
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.isRead)
        : notifications;

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn border border-gray-100 dark:border-gray-800">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Bell size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Bildirishnomalar</h2>
                            <p className="text-xs text-white/80">{unreadCount} ta o'qilmagan</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Yopish" className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Filter & Actions */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${filter === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            Barchasi
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-1 ${filter === 'unread' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            <BellOff size={14} /> O'qilmagan
                        </button>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            <CheckCheck size={14} /> Barchasini o'qilgan deb belgilash
                        </button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                            <Bell size={40} strokeWidth={1.5} />
                            <p className="mt-3 text-sm font-medium">Bildirishnomalar yo'q</p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification, index) => (
                            <div
                                key={notification.id}
                                className={`relative p-4 rounded-2xl border transition-all duration-200 group animate-fadeInUp ${notification.isRead
                                    ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/50 shadow-sm'
                                    }`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notification.isRead ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800 shadow-sm'}`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`text-sm font-semibold ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                                                {notification.title}
                                            </h4>
                                            {!notification.isRead && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-2">
                                            {getTimeAgo(notification.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!notification.isRead && (
                                        <button
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                            aria-label="O'qilgan deb belgilash"
                                        >
                                            <Check size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(notification.id)}
                                        className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-lg hover:bg-red-200 transition-colors"
                                        title="O'chirish"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};
