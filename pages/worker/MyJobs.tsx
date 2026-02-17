import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockDb';
import { ApiService } from '../../services/api';
import { Order, OrderStatus, User } from '../../types';
import {
  Clock, CheckCircle, MapPin, User as UserIcon, Phone, Play,
  ArrowUpRight, Loader2, Briefcase, FileText, TrendingUp, Calendar,
  Star, ChevronRight, Award, Zap
} from '../../components/Icons';
import { formatMoney } from '../../utils/formatMoney';
import { Link, useNavigate } from 'react-router-dom';
import { openChatWith } from '../../services/chatUtils';
import { MessageCircle, BadgeCheck, Banknote, Clock3, Wallet, Target } from 'lucide-react';
import { toast } from 'react-toastify';
import { OrderTimeline } from '../../components/OrderTimeline';

interface ExtendedOrder extends Order {
  customerInfo?: User;
}

interface WorkerStats {
  totalEarnings: number;
  pendingEarnings: number;
  completedJobs: number;
  activeJobs: number;
  avgRating: number;
  thisMonthEarnings: number;
}

export const MyJobs = () => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'EARNINGS'>('ACTIVE');
  const [myOrders, setMyOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const navigate = useNavigate();

  const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const CURRENT_WORKER_ID = currentUser?.id;

  const loadOrders = async () => {
    const data = await MockService.getOrders();
    const workerOrders = data.filter(o => o.workerId === CURRENT_WORKER_ID);
    workerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const ordersWithCustomerInfo: ExtendedOrder[] = await Promise.all(
      workerOrders.map(async (order) => {
        let customerInfo: User | undefined;
        try {
          customerInfo = await ApiService.getUserById(order.customerId);
        } catch (e) {
          console.error('Could not load customer info:', e);
        }
        return { ...order, customerInfo };
      })
    );

    setMyOrders(ordersWithCustomerInfo);
    calculateStats(ordersWithCustomerInfo);
    setIsLoading(false);
  };

  // Xavfsiz narx olish - juda katta yoki noto'g'ri raqamlarni filtrlash
  const getSafePrice = (price: any): number => {
    const numPrice = Number(price);
    // Agar narx 100 million dan katta bo'lsa, bu xato - 0 qaytaramiz
    if (isNaN(numPrice) || numPrice > 100000000 || numPrice < 0) {
      return 0;
    }
    return numPrice;
  };

  const calculateStats = (orders: ExtendedOrder[]) => {
    const completed = orders.filter(o => o.status === OrderStatus.COMPLETED);
    const active = orders.filter(o =>
      o.status === OrderStatus.ACCEPTED || o.status === OrderStatus.IN_PROGRESS
    );

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    const thisMonthCompleted = completed.filter(o => new Date(o.createdAt) >= thisMonth);

    // 10% platform commission - safe price bilan
    const totalEarnings = completed.reduce((sum, o) => sum + (getSafePrice(o.price) * 0.9), 0);
    const pendingEarnings = active.reduce((sum, o) => sum + (getSafePrice(o.price) * 0.9), 0);
    const thisMonthEarnings = thisMonthCompleted.reduce((sum, o) => sum + (getSafePrice(o.price) * 0.9), 0);

    setWorkerStats({
      totalEarnings,
      pendingEarnings,
      completedJobs: completed.length,
      activeJobs: active.length,
      avgRating: currentUser?.rating || 5.0,
      thisMonthEarnings
    });
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStartJob = async (id: string) => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 500));
    await MockService.startOrder(id);
    setProcessingId(null);
    await loadOrders();
    toast.info("Ish boshlandi! Muvaffaqiyatli yakunlang 💪");
  };

  const handleCompleteJob = async (order: ExtendedOrder) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
  };

  const confirmCompleteJob = async () => {
    if (!selectedOrder) return;

    setProcessingId(selectedOrder.id);
    setShowPaymentModal(false);

    try {
      await new Promise(r => setTimeout(r, 500));

      await MockService.completeOrder(selectedOrder.id);

      // Update worker balance - xavfsiz narx bilan
      const safePrice = getSafePrice(selectedOrder.price);
      const earnings = safePrice * 0.9;
      const newBalance = (currentUser?.balance || 0) + earnings;

      await ApiService.updateUser(CURRENT_WORKER_ID, { balance: newBalance } as any);

      // Update local storage
      const updatedUser = { ...currentUser, balance: newBalance };
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Tranzaksiya qo'shish - hamyonda ko'rinishi uchun
      const existingTransactions = JSON.parse(localStorage.getItem('userTransactions') || '[]');
      const newTransaction = {
        id: Date.now().toString(),
        type: 'earning',
        amount: earnings,
        description: `Ish bajarildi: ${selectedOrder.title}`,
        date: new Date().toISOString(),
        status: 'success'
      };
      localStorage.setItem('userTransactions', JSON.stringify([newTransaction, ...existingTransactions]));

      setMyOrders(prev => prev.map(o =>
        o.id === selectedOrder.id ? { ...o, status: OrderStatus.COMPLETED } : o
      ));

      await loadOrders();
      setActiveTab('EARNINGS');

      toast.success(`🎉 Tabriklaymiz! ${earnings.toLocaleString()} so'm hisobingizga o'tkazildi!`);
    } catch (error) {
      console.error('Error completing job:', error);
      toast.error('Xatolik yuz berdi. Qaytadan urinib ko\'ring.');
    } finally {
      setProcessingId(null);
      setSelectedOrder(null);
    }
  };

  const handleChatWithCustomer = async (customerId: string) => {
    if (!CURRENT_WORKER_ID) {
      toast.warning("Chat uchun tizimga kiring!");
      navigate('/auth');
      return;
    }
    await openChatWith(CURRENT_WORKER_ID, customerId, navigate);
  };

  const activeOrders = myOrders.filter(o =>
    o.status === OrderStatus.ACCEPTED ||
    o.status === OrderStatus.IN_PROGRESS
  );

  const historyOrders = myOrders.filter(o =>
    o.status === OrderStatus.COMPLETED ||
    o.status === OrderStatus.CANCELLED
  );

  const displayOrders = activeTab === 'ACTIVE' ? activeOrders : historyOrders;

  const StatCard = ({ icon: Icon, label, value, color, suffix = '' }: any) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}{suffix}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24">
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 pb-20">
        <h1 className="text-xl font-bold text-white mb-1">Mening Ishlarim</h1>
        <p className="text-white/70 text-sm mb-6">Buyurtmalar va daromadingiz</p>

        {/* Mini Stats */}
        {workerStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={16} className="text-green-300" />
                <span className="text-white/70 text-xs">Jami daromad</span>
              </div>
              <p className="text-xl font-bold text-white">{formatMoney(workerStats.totalEarnings)} so'm</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-1">
                <Clock3 size={16} className="text-yellow-300" />
                <span className="text-white/70 text-xs">Kutilmoqda</span>
              </div>
              <p className="text-xl font-bold text-white">{formatMoney(workerStats.pendingEarnings)} so'm</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-1.5 flex">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'ACTIVE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Zap size={16} />
            Faol ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <CheckCircle size={16} />
            Tarix ({historyOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('EARNINGS')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'EARNINGS' ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <Banknote size={16} />
            Daromad
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center pt-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : activeTab === 'EARNINGS' ? (
          /* Earnings Tab */
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Wallet} label="Jami daromad" value={formatMoney(workerStats?.totalEarnings || 0)} color="bg-gradient-to-r from-green-500 to-emerald-600" suffix=" so'm" />
              <StatCard icon={Calendar} label="Bu oy" value={formatMoney(workerStats?.thisMonthEarnings || 0)} color="bg-gradient-to-r from-blue-500 to-indigo-600" suffix=" so'm" />
              <StatCard icon={Target} label="Bajarilgan ishlar" value={workerStats?.completedJobs || 0} color="bg-gradient-to-r from-purple-500 to-violet-600" />
              <StatCard icon={Star} label="Reyting" value={(workerStats?.avgRating || 5).toFixed(1)} color="bg-gradient-to-r from-yellow-500 to-orange-600" suffix="/5" />
            </div>

            {/* Completed Jobs with Earnings */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp size={18} className="text-green-500" />
                  Daromad tarixi
                </h3>
              </div>

              {historyOrders.filter(o => o.status === OrderStatus.COMPLETED).length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Banknote size={28} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Hali daromad yo'q</p>
                  <p className="text-sm text-gray-400 mt-1">Ishlarni bajaring va pul ishlang!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {historyOrders.filter(o => o.status === OrderStatus.COMPLETED).map(order => (
                    <div key={order.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                          <BadgeCheck size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{order.title}</p>
                          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">+{(getSafePrice(order.price) * 0.9).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">so'm</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Withdraw Button */}
            <button
              onClick={() => navigate('/profile')}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2 hover:from-green-700 hover:to-emerald-700 transition-all"
            >
              <Wallet size={20} />
              Hamyonga o'tish
              <ChevronRight size={18} />
            </button>
          </div>
        ) : displayOrders.length > 0 ? (
          displayOrders.map(order => (
            <div key={order.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === OrderStatus.IN_PROGRESS ? 'bg-purple-500' :
                order.status === OrderStatus.ACCEPTED ? 'bg-blue-500' :
                  order.status === OrderStatus.COMPLETED ? 'bg-green-500' : 'bg-gray-400'
                }`}></div>

              <div className="flex justify-between items-start mb-4 pl-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{order.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: #{order.id.slice(0, 8)}</p>
                </div>

                {order.status === OrderStatus.IN_PROGRESS ? (
                  <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase animate-pulse flex items-center">
                    <Loader2 size={10} className="animate-spin mr-1" /> Jarayonda
                  </span>
                ) : order.status === OrderStatus.ACCEPTED ? (
                  <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">
                    Qabul qilindi
                  </span>
                ) : order.status === OrderStatus.COMPLETED ? (
                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1">
                    <CheckCircle size={10} /> Bajarildi
                  </span>
                ) : (
                  <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">
                    Bekor
                  </span>
                )}
              </div>

              <div className="pl-3 space-y-3 mb-5">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <UserIcon size={16} className="mr-3 text-gray-400" />
                  <span>Mijoz: {order.customerInfo ? `${order.customerInfo.name} ${order.customerInfo.surname || ''}` : 'Noma\'lum'}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Phone size={16} className="mr-3 text-gray-400" />
                  <a href={`tel:+998${order.customerInfo?.phone || ''}`} className="hover:text-blue-600 hover:underline">
                    {order.customerInfo?.phone ? `+998 ${order.customerInfo.phone}` : 'Telefon yo\'q'}
                  </a>
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <MapPin size={16} className="mr-3 text-gray-400" />
                  {order.location}
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl mt-2 flex items-start">
                  <FileText size={16} className="mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{order.description}"</p>
                </div>

                {/* Price with earnings breakdown */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-xl mt-3 border border-green-100 dark:border-green-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Buyurtma narxi:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{getSafePrice(order.price).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Platforma komissiyasi (10%):</span>
                    <span className="text-sm text-red-500">-{(getSafePrice(order.price) * 0.1).toLocaleString()} so'm</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-green-200 dark:border-green-800">
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">Sizning daromadingiz:</span>
                    <span className="font-bold text-xl text-green-600 dark:text-green-400">{(getSafePrice(order.price) * 0.9).toLocaleString()} so'm</span>
                  </div>
                </div>

                {/* Vaqt jadvali */}
                <div className="mt-3">
                  <OrderTimeline
                    createdAt={order.createdAt}
                    acceptedAt={order.acceptedAt}
                    startedAt={order.startedAt}
                    completedAt={order.completedAt}
                    status={order.status}
                  />
                </div>
              </div>

              {activeTab === 'ACTIVE' && (
                <div className="pl-3 space-y-3">
                  <button
                    onClick={() => handleChatWithCustomer(order.customerId)}
                    className="w-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 py-2.5 px-4 rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
                  >
                    <MessageCircle size={18} />
                    Mijoz bilan bog'lanish
                  </button>

                  <div className="flex space-x-3">
                    {order.status === OrderStatus.ACCEPTED && (
                      <button
                        onClick={() => handleStartJob(order.id)}
                        disabled={processingId === order.id}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/30 active:scale-95 disabled:opacity-50"
                      >
                        {processingId === order.id ? <Loader2 className="animate-spin" /> : <Play size={18} fill="currentColor" />}
                        <span>Boshlash</span>
                      </button>
                    )}

                    {order.status === OrderStatus.IN_PROGRESS && (
                      <button
                        onClick={() => handleCompleteJob(order)}
                        disabled={processingId === order.id}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-green-500/30 active:scale-95 disabled:opacity-50"
                      >
                        {processingId === order.id ? <Loader2 className="animate-spin" /> : <Banknote size={18} />}
                        <span>Tugatish va to'lov olish</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'HISTORY' && order.status === OrderStatus.COMPLETED && (
                <div className="pl-3 mt-3">
                  <button
                    onClick={() => handleChatWithCustomer(order.customerId)}
                    className="w-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 py-2.5 px-4 rounded-xl font-medium shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
                  >
                    <MessageCircle size={18} />
                    Mijoz bilan bog'lanish
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-20 opacity-60 flex flex-col items-center">
            <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
              <Briefcase size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Hozircha ishlar yo'q</p>
            {activeTab === 'ACTIVE' && (
              <Link to="/worker/home" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg text-sm">
                Yangi ish qidirish
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl animate-slideUp">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <Banknote size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ishni yakunlash</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Ishni tugatganingizni tasdiqlaysizmi?</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{selectedOrder.title}</p>
              <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Buyurtma narxi:</span>
                <span className="font-semibold">{selectedOrder.price.toLocaleString()} so'm</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Komissiya (10%):</span>
                <span className="text-red-500">-{(selectedOrder.price * 0.1).toLocaleString()} so'm</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t-2 border-green-500 mt-2">
                <span className="font-bold text-green-600 dark:text-green-400">Siz olasiz:</span>
                <span className="font-bold text-2xl text-green-600 dark:text-green-400">{(selectedOrder.price * 0.9).toLocaleString()} so'm</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmCompleteJob}
                disabled={processingId !== null}
                className="flex-1 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processingId ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
                Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};