import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockDb';
import { PlusCircle, Users, FileText, ChevronDown, TrendingUp } from '../../components/Icons';
import { Order, WorkerProfile } from '../../types';

// Import admin components
import {
  StatsCards,
  RevenueChart,
  OrderStatusChart,
  CategoryStats,
  RegionStats,
  RecentOrders,
  TopWorkers
} from '../../components/admin';

export const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [topWorkers, setTopWorkers] = useState<WorkerProfile[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [regionStats, setRegionStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [showQuickActions, setShowQuickActions] = useState(false);

  const chartData = [
    { name: 'Dush', orders: 40, revenue: 2400 },
    { name: 'Sesh', orders: 30, revenue: 1398 },
    { name: 'Chor', orders: 20, revenue: 9800 },
    { name: 'Pay', orders: 27, revenue: 3908 },
    { name: 'Jum', orders: 18, revenue: 4800 },
    { name: 'Shan', orders: 23, revenue: 3800 },
    { name: 'Yak', orders: 34, revenue: 4300 },
  ];

  const BAR_COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

  useEffect(() => {
    loadDashboardData();
  }, [dateFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, orders, workers, allUsers] = await Promise.all([
        MockService.getStats(),
        MockService.getOrders(),
        MockService.getWorkers(),
        MockService.getAllUsers()
      ]);

      const filteredOrders = filterByDate(orders);

      setStats({
        ...statsData,
        filteredOrders: filteredOrders.length,
        filteredRevenue: filteredOrders.filter(o => o.status === 'COMPLETED')
          .reduce((sum, o) => sum + (Number(o.price) || 0), 0)
      });

      const sortedOrders = [...filteredOrders].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentOrders(sortedOrders.slice(0, 5));

      const sortedWorkers = [...workers].sort((a, b) =>
        (Number(b.rating) || 0) - (Number(a.rating) || 0)
      );
      setTopWorkers(sortedWorkers.slice(0, 5));

      const customers = allUsers.filter(u => u.role === 'CUSTOMER');
      const customerOrderCounts = customers.map(customer => {
        const customerOrders = orders.filter(o => o.customerId === customer.id);
        return {
          ...customer,
          orderCount: customerOrders.length,
        };
      }).sort((a, b) => b.orderCount - a.orderCount);
      setTopCustomers(customerOrderCounts.slice(0, 5));

      const statusCounts = {
        PENDING: filteredOrders.filter(o => o.status === 'PENDING').length,
        IN_PROGRESS: filteredOrders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'ACCEPTED').length,
        COMPLETED: filteredOrders.filter(o => o.status === 'COMPLETED').length,
        CANCELLED: filteredOrders.filter(o => o.status === 'CANCELLED').length,
      };
      setOrdersByStatus([
        { name: 'Kutilmoqda', value: statusCounts.PENDING, color: '#f59e0b' },
        { name: 'Jarayonda', value: statusCounts.IN_PROGRESS, color: '#3b82f6' },
        { name: 'Bajarilgan', value: statusCounts.COMPLETED, color: '#10b981' },
        { name: 'Bekor', value: statusCounts.CANCELLED, color: '#ef4444' },
      ].filter(s => s.value > 0));

      const categories: Record<string, number> = {};
      filteredOrders.forEach(order => {
        const cat = order.category || 'Boshqa';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      const catStats = Object.entries(categories)
        .map(([name, value], idx) => ({ name, value, fill: BAR_COLORS[idx % BAR_COLORS.length] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      setCategoryStats(catStats);

      const regions: Record<string, number> = {};
      filteredOrders.forEach(order => {
        const location = order.location?.split(',')[0] || 'Noma\'lum';
        regions[location] = (regions[location] || 0) + 1;
      });
      const regStats = Object.entries(regions)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      setRegionStats(regStats);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByDate = (orders: Order[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      switch (dateFilter) {
        case 'today': return orderDate >= today;
        case 'week': return orderDate >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month': return orderDate >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        case 'year': return orderDate >= new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        default: return true;
      }
    });
  };

  const exportToCSV = () => {
    if (recentOrders.length === 0) {
      alert('Eksport qilish uchun ma\'lumot yo\'q');
      return;
    }
    const headers = ['ID', 'Sarlavha', 'Kategoriya', 'Joylashuv', 'Narx', 'Holat', 'Sana'];
    const csvRows = [headers.join(',')];
    recentOrders.forEach(order => {
      const row = [
        order.id,
        `"${order.title?.replace(/"/g, '""') || ''}"`,
        `"${order.category || 'Boshqa'}"`,
        `"${order.location?.replace(/"/g, '""') || ''}"`,
        order.price || 0,
        order.status,
        new Date(order.createdAt).toLocaleDateString('uz-UZ')
      ];
      csvRows.push(row.join(','));
    });
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `buyurtmalar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Boshqaruv Paneli</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Platformaning umumiy ko'rinishi</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:border-blue-500 transition-colors"
            >
              <option value="today">Bugun</option>
              <option value="week">So'nggi 7 kun</option>
              <option value="month">So'nggi 30 kun</option>
              <option value="year">So'nggi yil</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Quick Actions */}
          <div className="relative">
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <PlusCircle size={16} />
              Tezkor amallar
              <ChevronDown size={14} className={`transition-transform ${showQuickActions ? 'rotate-180' : ''}`} />
            </button>

            {showQuickActions && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 z-50">
                <button
                  onClick={() => { window.location.href = '/create-order'; setShowQuickActions(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <PlusCircle size={16} className="text-blue-500" />
                  Yangi buyurtma
                </button>
                <button
                  onClick={() => { window.location.href = '/admin/users'; setShowQuickActions(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <Users size={16} className="text-green-500" />
                  Yangi usta qo'shish
                </button>
                <button
                  onClick={() => { exportToCSV(); setShowQuickActions(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <FileText size={16} className="text-purple-500" />
                  Excel hisobot
                </button>
                <hr className="my-2 border-gray-100 dark:border-gray-700" />
                <button
                  onClick={() => { loadDashboardData(); setShowQuickActions(false); }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 text-gray-700 dark:text-gray-300"
                >
                  <TrendingUp size={16} className="text-orange-500" />
                  Ma'lumotlarni yangilash
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>
        <OrderStatusChart data={ordersByStatus} />
      </div>

      {/* Row 2: Category & Region Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CategoryStats data={categoryStats} />
        <RegionStats data={regionStats} />
      </div>

      {/* Row 3: Orders & Top Workers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <RecentOrders orders={recentOrders} onViewAll={() => window.location.href = '/admin/orders'} />
        </div>
        <TopWorkers workers={topWorkers} customers={topCustomers} />
      </div>
    </div>
  );
};