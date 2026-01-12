import React from 'react';
import { Users, Briefcase, DollarSign, TrendingUp } from '../Icons';

interface StatsCardsProps {
    stats: {
        totalUsers: number;
        activeOrders: number;
        filteredRevenue?: number;
        revenue?: number;
        filteredOrders?: number;
        totalOrders: number;
    } | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
    const cards = [
        { label: 'Foydalanuvchilar', value: stats?.totalUsers || 0, icon: <Users size={20} />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', trend: '+8%' },
        { label: 'Faol Buyurtmalar', value: stats?.activeOrders || 0, icon: <Briefcase size={20} />, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', trend: '+12%' },
        { label: 'Daromad', value: `${((stats?.filteredRevenue || stats?.revenue || 0) / 1000).toFixed(0)}k`, icon: <DollarSign size={20} />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', trend: '+15%' },
        { label: 'Buyurtmalar', value: stats?.filteredOrders || stats?.totalOrders || 0, icon: <TrendingUp size={20} />, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', trend: '+5%' },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((stat, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
                            {stat.icon}
                        </div>
                        <span className="text-xs font-bold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">{stat.trend}</span>
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">{stat.value}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">{stat.label}</p>
                </div>
            ))}
        </div>
    );
};
