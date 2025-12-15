import React, { useState, useEffect } from 'react';
import { X, Briefcase, TrendingUp, DollarSign, CheckCircle, Clock, XCircle, Star, ChevronRight, BarChart3, Calendar } from 'lucide-react';
import { User, UserRole, Order } from '../types';
import { ApiService } from '../services/api';

interface JobsStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

export const JobsStatsModal: React.FC<JobsStatsModalProps> = ({ isOpen, onClose, user }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending'>('all');

    useEffect(() => {
        if (isOpen) {
            loadOrders();
        }
    }, [isOpen]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const allOrders = await ApiService.getOrders();
            // Filter based on user role
            const userOrders = user.role === UserRole.WORKER
                ? allOrders.filter(o => o.workerId === user.id)
                : allOrders.filter(o => o.customerId === user.id);
            setOrders(userOrders);
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    // Statistics
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const pendingOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'ACCEPTED' || o.status === 'IN_PROGRESS');
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED');
    const totalEarnings = completedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    // Category stats
    const categoryStats = completedOrders.reduce((acc, order) => {
        const cat = order.category || 'Boshqa';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    // Filter orders for display
    const filteredOrders = activeTab === 'all' ? orders :
        activeTab === 'completed' ? completedOrders : pendingOrders;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">Bajarildi</span>;
            case 'PENDING':
                return <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-full">Kutilmoqda</span>;
            case 'IN_PROGRESS':
                return <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full">Jarayonda</span>;
            case 'CANCELLED':
                return <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full">Bekor</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 text-xs font-bold rounded-full">{status}</span>;
        }
    };

    if (!isOpen) return null;

    const isWorker = user.role === UserRole.WORKER;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="h-full flex flex-col bg-white dark:bg-gray-900">

                {/* Header */}
                <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-6 pb-8">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Briefcase size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {isWorker ? "Mening ishlarim" : "Buyurtmalarim"}
                            </h2>
                            <p className="text-sm text-white/70">
                                {isWorker ? "Bajarilgan ishlar va statistika" : "Buyurtmalar tarixi"}
                            </p>
                        </div>
                    </div>

                    {/* Stats Cards Row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                            <CheckCircle size={20} className="text-green-300 mx-auto mb-1" />
                            <p className="text-2xl font-black text-white">{completedOrders.length}</p>
                            <p className="text-xs text-white/70">Bajarilgan</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                            <Clock size={20} className="text-yellow-300 mx-auto mb-1" />
                            <p className="text-2xl font-black text-white">{pendingOrders.length}</p>
                            <p className="text-xs text-white/70">Faol</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
                            <DollarSign size={20} className="text-emerald-300 mx-auto mb-1" />
                            <p className="text-xl font-black text-white">{(totalEarnings / 1000).toFixed(0)}k</p>
                            <p className="text-xs text-white/70">{isWorker ? "Daromad" : "Sarflangan"}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto -mt-4">

                    {/* Top Categories */}
                    {topCategories.length > 0 && (
                        <div className="mx-6 mb-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4">
                            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <BarChart3 size={16} className="text-blue-500" />
                                Top kategoriyalar
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {topCategories.map(([category, count]) => (
                                    <div key={category} className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{category}</span>
                                        <span className="text-xs font-bold text-blue-500 bg-blue-100 dark:bg-blue-800 px-1.5 py-0.5 rounded-full">
                                            {count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="px-6 mb-4">
                        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                            {[
                                { key: 'all', label: 'Barchasi', count: orders.length },
                                { key: 'completed', label: 'Bajarilgan', count: completedOrders.length },
                                { key: 'pending', label: 'Faol', count: pendingOrders.length },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                        }`}
                                >
                                    {tab.label} ({tab.count})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Orders List */}
                    <div className="px-6 pb-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-500 dark:text-gray-400">Yuklanmoqda...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="text-center py-12">
                                <Briefcase size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400">Hozircha ma'lumot yo'q</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredOrders.slice(0, 10).map(order => (
                                    <div
                                        key={order.id}
                                        className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 dark:text-white truncate">{order.title}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{order.location}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Calendar size={12} className="text-gray-400" />
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <p className="font-bold text-green-600 dark:text-green-400">
                                                    {order.price?.toLocaleString()} UZS
                                                </p>
                                                {getStatusBadge(order.status)}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredOrders.length > 10 && (
                                    <p className="text-center text-sm text-gray-400 pt-2">
                                        +{filteredOrders.length - 10} ta boshqa
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobsStatsModal;
