import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MockService } from '../../services/mockDb';
import { GeminiService } from '../../services/geminiService';
import { Users, Briefcase, DollarSign, TrendingUp, Zap } from '../../components/Icons';

export const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState('Bozor tahlili yuklanmoqda...');

  const data = [
    { name: 'Dush', orders: 40, revenue: 2400 },
    { name: 'Sesh', orders: 30, revenue: 1398 },
    { name: 'Chor', orders: 20, revenue: 9800 },
    { name: 'Pay', orders: 27, revenue: 3908 },
    { name: 'Jum', orders: 18, revenue: 4800 },
    { name: 'Shan', orders: 23, revenue: 3800 },
    { name: 'Yak', orders: 34, revenue: 4300 },
  ];

  useEffect(() => {
    MockService.getStats().then(setStats);
    
    // Simulate getting recent orders for AI analysis
    MockService.getOrders().then(orders => {
      GeminiService.analyzeMarketTrends(orders).then(setAiAnalysis);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Boshqaruv Paneli</h1>
        <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
          So'nggi 7 kun
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Foydalanuvchilar', value: stats?.totalUsers || '...', icon: <Users size={24} />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'Faol Buyurtmalar', value: stats?.activeOrders || '...', icon: <Briefcase size={24} />, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-900/30' },
          { label: 'Daromad (so\'m)', value: (stats?.revenue || 0).toLocaleString(), icon: <DollarSign size={24} />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
          { label: 'O\'sish', value: '+12.5%', icon: <TrendingUp size={24} />, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4 transition-transform hover:-translate-y-1">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg} ${stat.color}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-bold mb-6 text-gray-900 dark:text-white">Daromadlar Statistikasi</h3>
           <div className="h-72 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={data}>
                 <defs>
                   <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                 <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }} 
                    itemStyle={{ color: '#1f2937' }}
                 />
                 <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* AI Insight Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-blue-950 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden border border-indigo-800/50">
           <div className="absolute top-0 right-0 p-32 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
           <div className="flex items-center space-x-2 mb-4 relative z-10">
              <Zap className="text-yellow-400 fill-current" />
              <h3 className="font-bold text-lg">Gemini Bozor Tahlili</h3>
           </div>
           <p className="text-blue-100 dark:text-gray-300 text-sm leading-relaxed mb-6 relative z-10 opacity-90">
             {aiAnalysis}
           </p>
           <div className="mt-auto relative z-10">
             <button className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-colors text-white font-medium border border-white/10 backdrop-blur-sm w-full text-center">
               To'liq hisobotni yuklash
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};