import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { Order, OrderStatus, User, UserRole } from '../../types';
import {
    Search, Filter, Package, Clock, CheckCircle, XCircle, AlertTriangle,
    ChevronLeft, ChevronRight, X, Eye, Trash2, DollarSign, Calendar,
    TrendingUp, RefreshCw, MapPin, User as UserIcon, Phone, Star,
    MoreVertical, FileText, Download, Loader2, ArrowUpRight, ArrowDownRight,
    Briefcase, MessageSquare, ExternalLink, BarChart3
} from 'lucide-react';

export const AdminOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
    const [sortBy, setSortBy] = useState<'date' | 'price' | 'status'>('date');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [orders, searchQuery, statusFilter, categoryFilter, dateFilter, sortBy]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allOrders, allUsers] = await Promise.all([
                ApiService.getOrders(),
                ApiService.getAllUsers()
            ]);
            setOrders(allOrders);
            setUsers(allUsers);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getUserById = (id: string) => users.find(u => u.id === id);

    const applyFilters = () => {
        let result = [...orders];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(o =>
                o.title?.toLowerCase().includes(query) ||
                o.description?.toLowerCase().includes(query) ||
                o.location?.toLowerCase().includes(query) ||
                o.category?.toLowerCase().includes(query)
            );
        }

        // Status filter
        if (statusFilter !== 'ALL') {
            result = result.filter(o => o.status === statusFilter);
        }

        // Category filter
        if (categoryFilter !== 'ALL') {
            result = result.filter(o => o.category === categoryFilter);
        }

        // Date filter
        const now = new Date();
        if (dateFilter === 'TODAY') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            result = result.filter(o => new Date(o.createdAt) >= today);
        } else if (dateFilter === 'WEEK') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            result = result.filter(o => new Date(o.createdAt) >= weekAgo);
        } else if (dateFilter === 'MONTH') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            result = result.filter(o => new Date(o.createdAt) >= monthAgo);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'price':
                    return (Number(b.price) || 0) - (Number(a.price) || 0);
                case 'status':
                    return a.status.localeCompare(b.status);
                default:
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        setFilteredOrders(result);
        setCurrentPage(1);
    };

    // Get unique categories
    const categories = [...new Set(orders.map(o => o.category).filter(Boolean))];

    // Statistics
    const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
        accepted: orders.filter(o => o.status === OrderStatus.ACCEPTED).length,
        inProgress: orders.filter(o => o.status === OrderStatus.IN_PROGRESS).length,
        completed: orders.filter(o => o.status === OrderStatus.COMPLETED).length,
        cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
        totalRevenue: orders.filter(o => o.status === OrderStatus.COMPLETED)
            .reduce((sum, o) => sum + (Number(o.price) || 0), 0),
        todayOrders: orders.filter(o => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return new Date(o.createdAt) >= today;
        }).length
    };

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadge = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.PENDING:
                return (
                    <span className="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <Clock size={12} />
                        Kutilmoqda
                    </span>
                );
            case OrderStatus.ACCEPTED:
                return (
                    <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <CheckCircle size={12} />
                        Qabul qilindi
                    </span>
                );
            case OrderStatus.IN_PROGRESS:
                return (
                    <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Jarayonda
                    </span>
                );
            case OrderStatus.COMPLETED:
                return (
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <CheckCircle size={12} />
                        Bajarildi
                    </span>
                );
            case OrderStatus.CANCELLED:
                return (
                    <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <XCircle size={12} />
                        Bekor
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-full">
                        {status}
                    </span>
                );
        }
    };

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return;
        setActionLoading(true);
        try {
            await ApiService.deleteOrder(orderToDelete.id);
            setOrders(orders.filter(o => o.id !== orderToDelete.id));
            setShowDeleteModal(false);
            setOrderToDelete(null);
        } catch (error) {
            console.error('Error deleting order:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
        setActionLoading(true);
        try {
            await ApiService.updateOrder(orderId, { status: newStatus });
            setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            if (selectedOrder?.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (error) {
            console.error('Error updating order:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, label, value, color, subValue, trend }: any) => (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                <div className={`w-full h-full rounded-full ${color} opacity-10`}></div>
            </div>
            <div className="flex items-center justify-between relative">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-gray-900 dark:text-white">{value}</p>
                        {trend !== undefined && (
                            <span className={`text-xs font-bold flex items-center ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                    {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
                </div>
                <div className={`p-4 rounded-2xl ${color} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon size={28} className="text-white" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                            <Package size={24} className="text-white" />
                        </div>
                        Buyurtmalar Boshqaruvi
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Platformadagi barcha buyurtmalarni boshqaring</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Download size={18} />
                        Eksport
                    </button>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Yangilash
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                <StatCard icon={Package} label="Jami" value={stats.total} color="bg-gradient-to-br from-blue-500 to-blue-600" subValue={`${stats.todayOrders} ta bugun`} />
                <StatCard icon={Clock} label="Kutilmoqda" value={stats.pending} color="bg-gradient-to-br from-yellow-500 to-yellow-600" />
                <StatCard icon={Loader2} label="Jarayonda" value={stats.inProgress + stats.accepted} color="bg-gradient-to-br from-indigo-500 to-indigo-600" />
                <StatCard icon={CheckCircle} label="Bajarildi" value={stats.completed} color="bg-gradient-to-br from-green-500 to-green-600" />
                <StatCard icon={XCircle} label="Bekor" value={stats.cancelled} color="bg-gradient-to-br from-red-500 to-red-600" />
                <StatCard icon={DollarSign} label="Daromad" value={`${(stats.totalRevenue / 1000000).toFixed(1)}M`} color="bg-gradient-to-br from-emerald-500 to-emerald-600" subValue="UZS" />
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Sarlavha, tavsif yoki manzil bo'yicha qidirish..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px]"
                    >
                        <option value="ALL">Barcha statuslar</option>
                        <option value="PENDING">Kutilmoqda</option>
                        <option value="ACCEPTED">Qabul qilindi</option>
                        <option value="IN_PROGRESS">Jarayonda</option>
                        <option value="COMPLETED">Bajarildi</option>
                        <option value="CANCELLED">Bekor qilindi</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px]"
                    >
                        <option value="ALL">Barcha kategoriyalar</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>

                    {/* Date Filter */}
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[130px]"
                    >
                        <option value="ALL">Barcha vaqt</option>
                        <option value="TODAY">Bugun</option>
                        <option value="WEEK">So'nggi hafta</option>
                        <option value="MONTH">So'nggi oy</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[140px]"
                    >
                        <option value="date">Sana bo'yicha</option>
                        <option value="price">Narx bo'yicha</option>
                        <option value="status">Status bo'yicha</option>
                    </select>
                </div>

                {/* Active Filters */}
                {(searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || dateFilter !== 'ALL') && (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">Faol filterlar:</span>
                        {searchQuery && (
                            <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                                <Search size={12} />
                                "{searchQuery}"
                                <button onClick={() => setSearchQuery('')} className="hover:text-blue-800"><X size={12} /></button>
                            </span>
                        )}
                        {statusFilter !== 'ALL' && (
                            <span className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                                <Clock size={12} />
                                {statusFilter}
                                <button onClick={() => setStatusFilter('ALL')} className="hover:text-yellow-800"><X size={12} /></button>
                            </span>
                        )}
                        {categoryFilter !== 'ALL' && (
                            <span className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                                <Briefcase size={12} />
                                {categoryFilter}
                                <button onClick={() => setCategoryFilter('ALL')} className="hover:text-purple-800"><X size={12} /></button>
                            </span>
                        )}
                        {dateFilter !== 'ALL' && (
                            <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                                <Calendar size={12} />
                                {dateFilter === 'TODAY' ? 'Bugun' : dateFilter === 'WEEK' ? 'Hafta' : 'Oy'}
                                <button onClick={() => setDateFilter('ALL')} className="hover:text-green-800"><X size={12} /></button>
                            </span>
                        )}
                        <button
                            onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setCategoryFilter('ALL'); setDateFilter('ALL'); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                        >
                            Barchasini tozalash
                        </button>
                    </div>
                )}

                {/* Results count */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-gray-900 dark:text-white">{filteredOrders.length}</span> ta buyurtma topildi
                    </p>
                </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 dark:text-gray-400 mt-4">Ma'lumotlar yuklanmoqda...</p>
                        </div>
                    </div>
                ) : paginatedOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <Package size={40} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Buyurtmalar topilmadi</p>
                        <p className="text-gray-400 text-sm mt-1">Qidiruv yoki filter parametrlarini o'zgartiring</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buyurtma</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mijoz</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ishchi</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategoriya</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Narx</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sana</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {paginatedOrders.map((order) => {
                                    const customer = getUserById(order.customerId);
                                    const worker = order.workerId ? getUserById(order.workerId) : null;

                                    return (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white line-clamp-1">{order.title}</p>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                        <MapPin size={12} />
                                                        {order.location || 'Noaniq'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={customer?.avatar || `https://ui-avatars.com/api/?name=${customer?.name || 'U'}&background=0D8ABC&color=fff&size=40`}
                                                        alt={customer?.name}
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{customer?.name || 'Noma\'lum'}</p>
                                                        <p className="text-xs text-gray-400">{customer?.phone || '-'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {worker ? (
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={worker.avatar || `https://ui-avatars.com/api/?name=${worker.name}&background=10B981&color=fff&size=40`}
                                                            alt={worker.name}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{worker.name}</p>
                                                            <div className="flex items-center gap-1">
                                                                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                                                                <span className="text-xs text-gray-400">{worker.rating || '5.0'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">Tayinlanmagan</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg">
                                                    {order.category || 'Boshqa'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {(Number(order.price) || 0).toLocaleString()}
                                                    <span className="text-xs text-gray-400 ml-1">UZS</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                                    {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                                        title="Ko'rish"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setOrderToDelete(order); setShowDeleteModal(true); }}
                                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                                                        title="O'chirish"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredOrders.length} ta buyurtmadan <span className="font-bold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> ko'rsatilmoqda
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let page = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) page = currentPage - 2 + i;
                                    if (currentPage > totalPages - 3) page = totalPages - 4 + i;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-10 h-10 rounded-lg font-medium transition-colors ${currentPage === page
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-6">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                    <Package size={28} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">{selectedOrder.title}</h2>
                                    <p className="text-white/70 text-sm mt-1 flex items-center gap-2">
                                        <MapPin size={14} />
                                        {selectedOrder.location || 'Manzil ko\'rsatilmagan'}
                                    </p>
                                    <div className="mt-3">{getStatusBadge(selectedOrder.status)}</div>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Description */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Tavsif</p>
                                <p className="text-gray-700 dark:text-gray-300">{selectedOrder.description || 'Tavsif yo\'q'}</p>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Kategoriya</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{selectedOrder.category || 'Boshqa'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Narx</p>
                                    <p className="text-gray-900 dark:text-white font-bold text-lg">{(Number(selectedOrder.price) || 0).toLocaleString()} UZS</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Yaratilgan</p>
                                    <p className="text-gray-900 dark:text-white font-medium">
                                        {new Date(selectedOrder.createdAt).toLocaleDateString('uz-UZ')} {new Date(selectedOrder.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">ID</p>
                                    <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedOrder.id.slice(0, 12)}...</p>
                                </div>
                            </div>

                            {/* Customer & Worker */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-3">Mijoz</p>
                                    {(() => {
                                        const customer = getUserById(selectedOrder.customerId);
                                        return customer ? (
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={customer.avatar || `https://ui-avatars.com/api/?name=${customer.name}&background=0D8ABC&color=fff`}
                                                    alt={customer.name}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{customer.name} {customer.surname}</p>
                                                    <p className="text-xs text-gray-400">{customer.phone}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-400">Noma'lum</p>
                                        );
                                    })()}
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-3">Ishchi</p>
                                    {(() => {
                                        const worker = selectedOrder.workerId ? getUserById(selectedOrder.workerId) : null;
                                        return worker ? (
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={worker.avatar || `https://ui-avatars.com/api/?name=${worker.name}&background=10B981&color=fff`}
                                                    alt={worker.name}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{worker.name} {worker.surname}</p>
                                                    <div className="flex items-center gap-1">
                                                        <Star size={12} className="text-yellow-500 fill-yellow-500" />
                                                        <span className="text-xs text-gray-500">{worker.rating || '5.0'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-400 italic">Hali tayinlanmagan</p>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Status Change */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-3">Statusni o'zgartirish</p>
                                <div className="flex flex-wrap gap-2">
                                    {Object.values(OrderStatus).map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                                            disabled={actionLoading || selectedOrder.status === status}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedOrder.status === status
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                                                } disabled:opacity-50`}
                                        >
                                            {status === 'PENDING' ? 'Kutilmoqda' :
                                                status === 'ACCEPTED' ? 'Qabul qilindi' :
                                                    status === 'IN_PROGRESS' ? 'Jarayonda' :
                                                        status === 'COMPLETED' ? 'Bajarildi' : 'Bekor'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => { setOrderToDelete(selectedOrder); setShowDeleteModal(true); setSelectedOrder(null); }}
                                    className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    O'chirish
                                </button>
                                <button
                                    onClick={() => setSelectedOrder(null)}
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    Yopish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && orderToDelete && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">O'chirishni tasdiqlang</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            <strong>"{orderToDelete.title}"</strong> buyurtmasini o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setOrderToDelete(null); }}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleDeleteOrder}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
