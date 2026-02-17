import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api';
import { User, UserRole } from '../../types';
import {
    Search, Filter, Users, UserCheck, UserX, Crown, Star, Mail, Phone,
    Calendar, ChevronLeft, ChevronRight, X, Edit2, Trash2, Eye, Shield,
    TrendingUp, Clock, CheckCircle, XCircle, MoreVertical, RefreshCw,
    UserPlus, Ban, Save, Loader2, AlertTriangle, Download, Upload
} from 'lucide-react';

interface EditUserData {
    name: string;
    surname: string;
    email: string;
    phone: string;
    role: UserRole;
    balance: number;
}

export const AdminUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
    const [sortBy, setSortBy] = useState<'name' | 'rating' | 'date' | 'balance'>('name');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [editFormData, setEditFormData] = useState<EditUserData | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUserData, setNewUserData] = useState<EditUserData>({
        name: '',
        surname: '',
        email: '',
        phone: '',
        role: UserRole.CUSTOMER,
        balance: 0
    });
    const [actionLoading, setActionLoading] = useState(false);
    const [showBanModal, setShowBanModal] = useState(false);
    const [userToBan, setUserToBan] = useState<User | null>(null);
    const [banReason, setBanReason] = useState('');
    const [banDuration, setBanDuration] = useState<string>('24h');
    const itemsPerPage = 10;

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [users, searchQuery, roleFilter, statusFilter, sortBy]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const allUsers = await ApiService.getAllUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...users];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(u =>
                u.name?.toLowerCase().includes(query) ||
                u.surname?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query) ||
                u.phone?.includes(query)
            );
        }

        // Role filter
        if (roleFilter !== 'ALL') {
            result = result.filter(u => u.role === roleFilter);
        }

        // Status filter
        if (statusFilter !== 'ALL') {
            result = result.filter(u =>
                statusFilter === 'ONLINE' ? u.isOnline : !u.isOnline
            );
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'rating':
                    return (Number(b.rating) || 0) - (Number(a.rating) || 0);
                case 'date':
                    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
                case 'balance':
                    return (b.balance || 0) - (a.balance || 0);
                default:
                    return (a.name || '').localeCompare(b.name || '');
            }
        });

        setFilteredUsers(result);
        setCurrentPage(1);
    };

    // Statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = {
        total: users.length,
        workers: users.filter(u => u.role === UserRole.WORKER).length,
        customers: users.filter(u => u.role === UserRole.CUSTOMER).length,
        admins: users.filter(u => u.role === UserRole.ADMIN).length,
        online: users.filter(u => u.isOnline).length,
        todayRegistered: users.filter(u => {
            const createdAt = new Date(u.createdAt || 0);
            return createdAt >= today;
        }).length
    };

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN:
                return <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-full flex items-center gap-1"><Crown size={12} />Admin</span>;
            case UserRole.WORKER:
                return <span className="px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full">Ishchi</span>;
            case UserRole.CUSTOMER:
                return <span className="px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded-full">Mijoz</span>;
            default:
                return <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-full">{role}</span>;
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setActionLoading(true);
        try {
            await ApiService.deleteUser(userToDelete.id);
            setUsers(users.filter(u => u.id !== userToDelete.id));
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error) {
            console.error('Error deleting user:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditUser = async () => {
        if (!userToEdit || !editFormData) return;
        setActionLoading(true);
        try {
            await ApiService.updateUser(userToEdit.id, editFormData);
            setUsers(users.map(u => u.id === userToEdit.id ? { ...u, ...editFormData } : u));
            setShowEditModal(false);
            setUserToEdit(null);
            setEditFormData(null);
        } catch (error) {
            console.error('Error updating user:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleBanUser = async () => {
        if (!userToBan) return;
        setActionLoading(true);
        try {
            const isBanned = userToBan.isBanned;
            if (isBanned) {
                // Unban
                const result = await ApiService.banUser(userToBan.id, { action: 'unban' });
                if (result?.user) {
                    setUsers(users.map(u => u.id === userToBan.id ? { ...u, ...result.user } : u));
                } else {
                    setUsers(users.map(u => u.id === userToBan.id ? { ...u, isBanned: false, blockReason: undefined, blockedUntil: undefined, blockedAt: undefined } : u));
                }
            } else {
                // Ban
                const result = await ApiService.banUser(userToBan.id, {
                    action: 'ban',
                    reason: banReason || undefined,
                    duration: banDuration
                });
                if (result?.user) {
                    setUsers(users.map(u => u.id === userToBan.id ? { ...u, ...result.user } : u));
                } else {
                    setUsers(users.map(u => u.id === userToBan.id ? { ...u, isBanned: true, blockReason: banReason } : u));
                }
            }
            setShowBanModal(false);
            setUserToBan(null);
            setBanReason('');
            setBanDuration('24h');
        } catch (error) {
            console.error('Error banning user:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const openEditModal = (user: User) => {
        setUserToEdit(user);
        setEditFormData({
            name: user.name || '',
            surname: user.surname || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role,
            balance: user.balance || 0
        });
        setShowEditModal(true);
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
                        {trend && (
                            <span className={`text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {trend > 0 ? '+' : ''}{trend}%
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
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                            <Users size={24} className="text-white" />
                        </div>
                        Foydalanuvchilar Boshqaruvi
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Platformadagi barcha foydalanuvchilarni boshqaring</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-lg shadow-green-500/25"
                    >
                        <UserPlus size={18} />
                        Yangi foydalanuvchi
                    </button>
                    <button
                        onClick={loadUsers}
                        disabled={loading}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        Yangilash
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard icon={Users} label="Jami" value={stats.total} color="bg-gradient-to-br from-blue-500 to-blue-600" />
                <StatCard icon={UserCheck} label="Ishchilar" value={stats.workers} color="bg-gradient-to-br from-indigo-500 to-indigo-600" subValue={`${stats.online} ta online`} />
                <StatCard icon={Shield} label="Mijozlar" value={stats.customers} color="bg-gradient-to-br from-green-500 to-green-600" />
                <StatCard icon={Crown} label="Adminlar" value={stats.admins} color="bg-gradient-to-br from-purple-500 to-purple-600" />
                <StatCard icon={TrendingUp} label="Faol" value={stats.online} color="bg-gradient-to-br from-emerald-500 to-emerald-600" subValue="online hozir" />
                <StatCard icon={Calendar} label="Bugun" value={stats.todayRegistered} color="bg-gradient-to-br from-orange-500 to-orange-600" subValue="yangi ro'yxatdan" />
            </div>

            {/* Filters & Search */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Ism, email yoki telefon bo'yicha qidirish..."
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

                    {/* Role Filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as any)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px]"
                    >
                        <option value="ALL">Barcha rollar</option>
                        <option value="WORKER">Ishchilar</option>
                        <option value="CUSTOMER">Mijozlar</option>
                        <option value="ADMIN">Adminlar</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px]"
                    >
                        <option value="ALL">Barcha statuslar</option>
                        <option value="ONLINE">Online</option>
                        <option value="OFFLINE">Offline</option>
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[150px]"
                    >
                        <option value="name">Ism bo'yicha</option>
                        <option value="rating">Reyting bo'yicha</option>
                        <option value="date">Sana bo'yicha</option>
                        <option value="balance">Balans bo'yicha</option>
                    </select>
                </div>

                {/* Active Filters */}
                {(searchQuery || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <span className="text-xs text-gray-500 font-medium">Faol filterlar:</span>
                        {searchQuery && (
                            <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                                <Search size={12} />
                                "{searchQuery}"
                                <button onClick={() => setSearchQuery('')} className="hover:text-blue-800"><X size={12} /></button>
                            </span>
                        )}
                        {roleFilter !== 'ALL' && (
                            <span className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                                <Users size={12} />
                                {roleFilter === 'WORKER' ? 'Ishchilar' : roleFilter === 'CUSTOMER' ? 'Mijozlar' : 'Adminlar'}
                                <button onClick={() => setRoleFilter('ALL')} className="hover:text-purple-800"><X size={12} /></button>
                            </span>
                        )}
                        {statusFilter !== 'ALL' && (
                            <span className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-lg flex items-center gap-2 font-medium">
                                {statusFilter === 'ONLINE' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                {statusFilter}
                                <button onClick={() => setStatusFilter('ALL')} className="hover:text-green-800"><X size={12} /></button>
                            </span>
                        )}
                        <button
                            onClick={() => { setSearchQuery(''); setRoleFilter('ALL'); setStatusFilter('ALL'); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline"
                        >
                            Barchasini tozalash
                        </button>
                    </div>
                )}

                {/* Results count */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-gray-900 dark:text-white">{filteredUsers.length}</span> ta foydalanuvchi topildi
                    </p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-500 dark:text-gray-400 mt-4">Ma'lumotlar yuklanmoqda...</p>
                        </div>
                    </div>
                ) : paginatedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                            <Users size={40} className="text-gray-400" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">Foydalanuvchilar topilmadi</p>
                        <p className="text-gray-400 text-sm mt-1">Qidiruv yoki filter parametrlarini o'zgartiring</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Foydalanuvchi</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kontakt</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reyting</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balans</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amallar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {paginatedUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                                        onClick={() => setSelectedUser(user)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <img
                                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`}
                                                        alt={user.name}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm group-hover:scale-105 transition-transform"
                                                    />
                                                    {user.isOnline && (
                                                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                                                    )}
                                                    {user.isBanned && (
                                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                                                            <Ban size={10} className="text-white" />
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                        {user.name} {user.surname}
                                                        {user.isBanned && (
                                                            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-500 text-[10px] font-bold rounded" title={user.blockReason || ''}>BANNED</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400">ID: {user.id.slice(0, 8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                    <Mail size={14} className="text-gray-400" />
                                                    {user.email || '-'}
                                                </p>
                                                <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                                    <Phone size={14} className="text-gray-400" />
                                                    {user.phone || '-'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRoleBadge(user.role)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.isOnline ? (
                                                <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                    Online
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-gray-400 text-sm">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                                    Offline
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1">
                                                <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                                <span className="font-semibold text-gray-900 dark:text-white">{user.rating || '0.0'}</span>
                                                <span className="text-xs text-gray-400">({user.ratingCount || 0})</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                {(user.balance || 0).toLocaleString()} <span className="text-xs text-gray-400">so'm</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                                    title="Ko'rish"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg text-amber-600 dark:text-amber-400 transition-colors"
                                                    title="Tahrirlash"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setUserToBan(user); setShowBanModal(true); }}
                                                    className={`p-2 rounded-lg transition-colors ${user.isBanned
                                                        ? 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400'
                                                        : 'hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-500'
                                                        }`}
                                                    title={user.isBanned ? 'Blokdan chiqarish' : 'Bloklash'}
                                                >
                                                    <Ban size={18} />
                                                </button>
                                                <button
                                                    onClick={() => { setUserToDelete(user); setShowDeleteModal(true); }}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
                                                    title="O'chirish"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
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
                            {filteredUsers.length} ta foydalanuvchidan <span className="font-bold text-gray-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> ko'rsatilmoqda
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

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-8 text-center">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <div className="relative inline-block">
                                <img
                                    src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.name}&size=120&background=fff&color=0D8ABC`}
                                    alt={selectedUser.name}
                                    className="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-xl"
                                />
                                {selectedUser.isOnline && (
                                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-3 border-white rounded-full"></span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-white mt-4">{selectedUser.name} {selectedUser.surname}</h2>
                            <div className="mt-2">{getRoleBadge(selectedUser.role)}</div>
                            {selectedUser.isBanned && (
                                <div className="mt-3 space-y-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-full">
                                        <Ban size={14} className="text-red-200" />
                                        <span className="text-red-100 text-sm font-medium">Bloklangan</span>
                                    </div>
                                    {selectedUser.blockReason && (
                                        <p className="text-red-200 text-xs">Sabab: {selectedUser.blockReason}</p>
                                    )}
                                    {selectedUser.blockedUntil && (
                                        <p className="text-red-200 text-xs">Gacha: {new Date(selectedUser.blockedUntil).toLocaleString('uz-UZ')}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Email</p>
                                    <p className="text-gray-900 dark:text-white font-medium truncate">{selectedUser.email || '-'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Telefon</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{selectedUser.phone || '-'}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Balans</p>
                                    <p className="text-gray-900 dark:text-white font-medium">{(selectedUser.balance || 0).toLocaleString()} so'm</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Reyting</p>
                                    <p className="text-gray-900 dark:text-white font-medium flex items-center gap-1">
                                        <Star size={16} className="text-yellow-500 fill-yellow-500" />
                                        {selectedUser.rating || '0.0'} ({selectedUser.ratingCount || 0} ta baho)
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                <span className="text-gray-600 dark:text-gray-300 font-medium">Status</span>
                                {selectedUser.isOnline ? (
                                    <span className="flex items-center gap-2 text-green-600 font-medium">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        Online
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 text-gray-400">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                        Offline
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => { openEditModal(selectedUser); setSelectedUser(null); }}
                                    className="flex-1 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 font-bold rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={18} />
                                    Tahrirlash
                                </button>
                                <button
                                    onClick={() => { setUserToDelete(selectedUser); setShowDeleteModal(true); setSelectedUser(null); }}
                                    className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    O'chirish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && userToEdit && editFormData && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Edit2 size={20} className="text-amber-500" />
                                Foydalanuvchini tahrirlash
                            </h3>
                            <button
                                onClick={() => { setShowEditModal(false); setUserToEdit(null); setEditFormData(null); }}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ism</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Familiya</label>
                                    <input
                                        type="text"
                                        value={editFormData.surname}
                                        onChange={(e) => setEditFormData({ ...editFormData, surname: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
                                <input
                                    type="tel"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                    <select
                                        value={editFormData.role}
                                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                    >
                                        <option value="CUSTOMER">Mijoz</option>
                                        <option value="WORKER">Ishchi</option>
                                        <option value="ADMIN">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Balans (so'm)</label>
                                    <input
                                        type="number"
                                        value={editFormData.balance}
                                        onChange={(e) => setEditFormData({ ...editFormData, balance: Number(e.target.value) })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => { setShowEditModal(false); setUserToEdit(null); setEditFormData(null); }}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleEditUser}
                                disabled={actionLoading}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Saqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <UserPlus size={20} className="text-green-500" />
                                Yangi foydalanuvchi
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ism *</label>
                                    <input
                                        type="text"
                                        value={newUserData.name}
                                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                                        placeholder="Ism kiriting"
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Familiya</label>
                                    <input
                                        type="text"
                                        value={newUserData.surname}
                                        onChange={(e) => setNewUserData({ ...newUserData, surname: e.target.value })}
                                        placeholder="Familiya kiriting"
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={newUserData.email}
                                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                    placeholder="email@example.com"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon *</label>
                                <input
                                    type="tel"
                                    value={newUserData.phone}
                                    onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                                    placeholder="+998 90 123 45 67"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                <select
                                    value={newUserData.role}
                                    onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                                >
                                    <option value="CUSTOMER">Mijoz</option>
                                    <option value="WORKER">Ishchi</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                disabled={!newUserData.name || !newUserData.email || !newUserData.phone}
                                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <UserPlus size={18} />
                                Qo'shish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {showBanModal && userToBan && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-8 shadow-2xl">
                        <div className="text-center">
                            <div className={`w-16 h-16 ${userToBan.isBanned ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                                {userToBan.isBanned ? (
                                    <CheckCircle size={32} className="text-green-500" />
                                ) : (
                                    <Ban size={32} className="text-orange-500" />
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {userToBan.isBanned ? 'Blokdan chiqarish' : 'Foydalanuvchini bloklash'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                <strong>{userToBan.name} {userToBan.surname}</strong>
                                {userToBan.isBanned && userToBan.blockReason && (
                                    <span className="block text-sm mt-1 text-red-400">Sabab: {userToBan.blockReason}</span>
                                )}
                            </p>
                        </div>

                        {/* Ban form — faqat bloklash uchun */}
                        {!userToBan.isBanned && (
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sabab</label>
                                    <input
                                        type="text"
                                        value={banReason}
                                        onChange={(e) => setBanReason(e.target.value)}
                                        placeholder="Masalan: Spam tarqatish, Qoidalar buzish..."
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Muddat</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[
                                            { value: '1h', label: '1 soat' },
                                            { value: '24h', label: '24 soat' },
                                            { value: '7d', label: '7 kun' },
                                            { value: '30d', label: '30 kun' },
                                            { value: 'permanent', label: 'Doimiy' }
                                        ].map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setBanDuration(opt.value)}
                                                className={`py-2 px-2 text-xs font-bold rounded-lg transition-all ${banDuration === opt.value
                                                    ? opt.value === 'permanent'
                                                        ? 'bg-red-600 text-white shadow-lg'
                                                        : 'bg-orange-600 text-white shadow-lg'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Foydalanuvchiga Telegram va ilovada xabar yuboriladi
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowBanModal(false); setUserToBan(null); setBanReason(''); setBanDuration('24h'); }}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleBanUser}
                                disabled={actionLoading}
                                className={`flex-1 py-3 ${userToBan.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'} text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50`}
                            >
                                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                                {userToBan.isBanned ? 'Blokdan chiqarish' : 'Bloklash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">O'chirishni tasdiqlang</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            <strong>{userToDelete.name} {userToDelete.surname}</strong> ni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Bekor qilish
                            </button>
                            <button
                                onClick={handleDeleteUser}
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
