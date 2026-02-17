import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { Order, OrderStatus, User } from '../../types';
import {
    TrendingUp, TrendingDown, CreditCard, Wallet, PiggyBank,
    ArrowUpRight, ArrowDownRight, Calendar, RefreshCw, Download, Filter,
    ChevronLeft, ChevronRight, Eye, Clock, CheckCircle, XCircle, X,
    BarChart3, PieChart, Activity, Banknote, Receipt,
    ArrowRightLeft, Building, Users, Package, Percent
} from 'lucide-react';
import { formatMoney } from '../../utils/formatMoney';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

interface Transaction {
    id: string;
    type: 'INCOME' | 'COMMISSION' | 'PAYOUT' | 'REFUND';
    amount: number;
    description: string;
    orderId?: string;
    userId?: string;
    userName?: string;
    status: 'SUCCESS' | 'PENDING' | 'FAILED';
    date: string;
}


export const AdminFinance = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'COMMISSION' | 'PAYOUT' | 'REFUND'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadData();
    }, []);

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

    // Generate transactions from orders
    const generateTransactions = (): Transaction[] => {
        const transactions: Transaction[] = [];

        orders.forEach(order => {
            if (order.status === OrderStatus.COMPLETED) {
                const customer = users.find(u => u.id === order.customerId);
                const worker = users.find(u => u.id === order.workerId);
                const amount = Number(order.price) || 0;
                const commission = amount * 0.1; // 10% commission

                // Income from order
                transactions.push({
                    id: `income-${order.id}`,
                    type: 'INCOME',
                    amount: amount,
                    description: `Buyurtma: ${order.title}`,
                    orderId: order.id,
                    userId: order.customerId,
                    userName: customer?.name || 'Noma\'lum',
                    status: 'SUCCESS',
                    date: order.createdAt
                });

                // Commission
                transactions.push({
                    id: `commission-${order.id}`,
                    type: 'COMMISSION',
                    amount: commission,
                    description: `Komissiya (10%): ${order.title}`,
                    orderId: order.id,
                    status: 'SUCCESS',
                    date: order.createdAt
                });

                // Payout to worker
                if (order.workerId) {
                    transactions.push({
                        id: `payout-${order.id}`,
                        type: 'PAYOUT',
                        amount: amount - commission,
                        description: `To'lov: ${worker?.name || 'Ishchi'}`,
                        orderId: order.id,
                        userId: order.workerId,
                        userName: worker?.name || 'Noma\'lum',
                        status: 'SUCCESS',
                        date: order.createdAt
                    });
                }
            }

            if (order.status === OrderStatus.CANCELLED) {
                const customer = users.find(u => u.id === order.customerId);
                const amount = Number(order.price) || 0;

                transactions.push({
                    id: `refund-${order.id}`,
                    type: 'REFUND',
                    amount: amount,
                    description: `Qaytarish: ${order.title}`,
                    orderId: order.id,
                    userId: order.customerId,
                    userName: customer?.name || 'Noma\'lum',
                    status: 'SUCCESS',
                    date: order.createdAt
                });
            }
        });

        return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const transactions = generateTransactions();

    // Filter transactions
    const filterByDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();

        switch (dateFilter) {
            case 'TODAY':
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return d >= today;
            case 'WEEK':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return d >= weekAgo;
            case 'MONTH':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return d >= monthAgo;
            case 'YEAR':
                const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                return d >= yearAgo;
            default:
                return true;
        }
    };

    const filteredTransactions = transactions
        .filter(t => filterByDate(t.date))
        .filter(t => typeFilter === 'ALL' || t.type === typeFilter);

    // Pagination
    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Calculate statistics
    const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
    const totalCommission = totalRevenue * 0.1;
    const totalPayouts = totalRevenue * 0.9;
    const cancelledRevenue = orders
        .filter(o => o.status === OrderStatus.CANCELLED)
        .reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    const pendingOrders = orders.filter(o =>
        o.status === OrderStatus.PENDING ||
        o.status === OrderStatus.ACCEPTED ||
        o.status === OrderStatus.IN_PROGRESS
    );
    const pendingRevenue = pendingOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);

    // Chart data - Revenue by month
    const getMonthlyData = () => {
        const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
        const data = months.map((name, index) => {
            const monthOrders = completedOrders.filter(o => {
                const d = new Date(o.createdAt);
                return d.getMonth() === index;
            });
            const revenue = monthOrders.reduce((sum, o) => sum + (Number(o.price) || 0), 0);
            const commission = revenue * 0.1;
            return { name, revenue: revenue / 1000, commission: commission / 1000 };
        });
        return data;
    };

    // Category distribution
    const getCategoryData = () => {
        const categoryMap: Record<string, number> = {};
        completedOrders.forEach(o => {
            const cat = o.category || 'Boshqa';
            categoryMap[cat] = (categoryMap[cat] || 0) + (Number(o.price) || 0);
        });
        return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    };

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

    const getTypeBadge = (type: Transaction['type']) => {
        switch (type) {
            case 'INCOME':
                return (
                    <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <ArrowDownRight size={12} />
                        Kirim
                    </span>
                );
            case 'COMMISSION':
                return (
                    <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <Percent size={12} />
                        Komissiya
                    </span>
                );
            case 'PAYOUT':
                return (
                    <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <ArrowUpRight size={12} />
                        To'lov
                    </span>
                );
            case 'REFUND':
                return (
                    <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold rounded-full flex items-center gap-1">
                        <ArrowRightLeft size={12} />
                        Qaytarish
                    </span>
                );
        }
    };

    const StatCard = ({ icon: Icon, label, value, color, subValue, trend, prefix = '', suffix = '' }: any) => (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
                <div className={`w-full h-full rounded-full ${color} opacity-10`}></div>
            </div>
            <div className="flex items-center justify-between relative">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{label}</p>
                    <div className="flex items-baseline gap-1 flex-wrap">
                        <p className="text-xl font-black text-gray-900 dark:text-white whitespace-nowrap">
                            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
                        </p>
                        {suffix && <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">{suffix}</span>}
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
                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                            <Banknote size={24} className="text-white" />
                        </div>
                        Moliya Boshqaruvi
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Platforma moliyaviy ko'rsatkichlari va tranzaksiyalar</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                        <Download size={18} />
                        Hisobot yuklash
                    </button>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Yangilash
                    </button>
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Banknote}
                    label="Jami daromad"
                    value={formatMoney(totalRevenue)}
                    suffix=" so'm"
                    color="bg-gradient-to-br from-emerald-500 to-emerald-600"
                    subValue={`${completedOrders.length} ta buyurtma`}
                    trend={12}
                />
                <StatCard
                    icon={Percent}
                    label="Komissiya (10%)"
                    value={formatMoney(totalCommission)}
                    suffix=" so'm"
                    color="bg-gradient-to-br from-purple-500 to-purple-600"
                    subValue="Sof foyda"
                    trend={8}
                />
                <StatCard
                    icon={Wallet}
                    label="Ishchilarga to'langan"
                    value={formatMoney(totalPayouts)}
                    suffix=" so'm"
                    color="bg-gradient-to-br from-blue-500 to-blue-600"
                    subValue="90% buyurtma summasi"
                />
                <StatCard
                    icon={Clock}
                    label="Kutilayotgan to'lovlar"
                    value={formatMoney(pendingRevenue)}
                    suffix=" so'm"
                    color="bg-gradient-to-br from-yellow-500 to-yellow-600"
                    subValue={`${pendingOrders.length} ta buyurtma`}
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={Package}
                    label="Jami buyurtmalar"
                    value={orders.length}
                    color="bg-gradient-to-br from-indigo-500 to-indigo-600"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Bajarilgan"
                    value={completedOrders.length}
                    color="bg-gradient-to-br from-green-500 to-green-600"
                    subValue={`${((completedOrders.length / Math.max(orders.length, 1)) * 100).toFixed(0)}% muvaffaqiyat`}
                />
                <StatCard
                    icon={Users}
                    label="Foydalanuvchilar"
                    value={users.length}
                    color="bg-gradient-to-br from-cyan-500 to-cyan-600"
                />
                <StatCard
                    icon={XCircle}
                    label="Qaytarilgan"
                    value={formatMoney(cancelledRevenue)}
                    suffix=" so'm"
                    color="bg-gradient-to-br from-red-500 to-red-600"
                    subValue="Bekor qilingan buyurtmalar"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 size={20} className="text-emerald-500" />
                                Oylik daromad
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Daromad va komissiya</p>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getMonthlyData()}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                                <YAxis stroke="#9CA3AF" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                    labelStyle={{ color: '#F9FAFB' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Daromad" />
                                <Area type="monotone" dataKey="commission" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorCommission)" name="Komissiya" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <PieChart size={20} className="text-blue-500" />
                            Kategoriyalar
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Daromad taqsimoti</p>
                    </div>
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={getCategoryData()}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {getCategoryData().map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => `${formatMoney(value)} so'm`}
                                    contentStyle={{
                                        backgroundColor: '#1F2937',
                                        border: 'none',
                                        borderRadius: '12px'
                                    }}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                        {getCategoryData().slice(0, 4).map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                                    <span className="text-sm text-gray-600 dark:text-gray-400">{entry.name}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatMoney(entry.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Filters */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Receipt size={20} className="text-emerald-500" />
                            Tranzaksiyalar tarixi
                        </h3>
                        <div className="flex items-center gap-3">
                            <select
                                value={dateFilter}
                                onChange={(e) => { setDateFilter(e.target.value as any); setCurrentPage(1); }}
                                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm"
                            >
                                <option value="ALL">Barcha vaqt</option>
                                <option value="TODAY">Bugun</option>
                                <option value="WEEK">Hafta</option>
                                <option value="MONTH">Oy</option>
                                <option value="YEAR">Yil</option>
                            </select>
                            <select
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value as any); setCurrentPage(1); }}
                                className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer text-sm"
                            >
                                <option value="ALL">Barcha turlar</option>
                                <option value="INCOME">Kirim</option>
                                <option value="COMMISSION">Komissiya</option>
                                <option value="PAYOUT">To'lovlar</option>
                                <option value="REFUND">Qaytarishlar</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Transactions Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 dark:text-gray-400 mt-4">Ma'lumotlar yuklanmoqda...</p>
                        </div>
                    </div>
                ) : paginatedTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <Receipt size={40} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Tranzaksiyalar topilmadi</p>
                        <p className="text-gray-400 text-sm mt-1">Filter parametrlarini o'zgartiring</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Turi</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tavsif</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Foydalanuvchi</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Summa</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sana</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {paginatedTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {getTypeBadge(transaction.type)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                                            {transaction.orderId && (
                                                <p className="text-xs text-gray-400">ID: {transaction.orderId.slice(0, 8)}...</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600 dark:text-gray-300">
                                                {transaction.userName || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`font-bold ${transaction.type === 'INCOME' || transaction.type === 'COMMISSION'
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : transaction.type === 'REFUND'
                                                        ? 'text-red-500'
                                                        : 'text-blue-600 dark:text-blue-400'
                                                }`}>
                                                {transaction.type === 'PAYOUT' || transaction.type === 'REFUND' ? '-' : '+'}
                                                {transaction.amount.toLocaleString()} <span className="text-xs font-normal">so'm</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full flex items-center gap-1 w-fit">
                                                <CheckCircle size={12} />
                                                Muvaffaq
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                                {new Date(transaction.date).toLocaleDateString('uz-UZ')}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(transaction.date).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredTransactions.length} ta tranzaksiyadan <span className="font-bold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)}</span> ko'rsatilmoqda
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
                                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
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
        </div>
    );
};
