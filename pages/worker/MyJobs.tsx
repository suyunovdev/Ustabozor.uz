import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockDb';
import { ApiService } from '../../services/api';
import { Order, OrderStatus, User } from '../../types';
import {
  Clock, CheckCircle, MapPin, DollarSign, User as UserIcon, Phone, Play,
  ArrowUpRight, Loader2, Briefcase, FileText
} from '../../components/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { openChatWith } from '../../services/chatUtils';
import { MessageCircle } from 'lucide-react';

// Kengaytirilgan Order tipi - mijoz ma'lumoti bilan
interface ExtendedOrder extends Order {
  customerInfo?: User;
}

export const MyJobs = () => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [myOrders, setMyOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get current user from localStorage
  const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const CURRENT_WORKER_ID = currentUser?.id;

  // Async function - mijoz ma'lumotlarini ham yuklaymiz
  const loadOrders = async () => {
    const data = await MockService.getOrders();
    const workerOrders = data.filter(o => o.workerId === CURRENT_WORKER_ID);
    workerOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Har bir buyurtma uchun mijoz ma'lumotini olish
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
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStartJob = async (id: string) => {
    setProcessingId(id);
    await new Promise(r => setTimeout(r, 500));
    await MockService.startOrder(id);
    setProcessingId(null);
    await loadOrders(); // Yangilanishni kutamiz
  };

  const handleCompleteJob = async (id: string) => {
    if (window.confirm("Ishni yakunlashni tasdiqlaysizmi?")) {
      setProcessingId(id);
      await new Promise(r => setTimeout(r, 500));

      // 1. Bazada statusni o'zgartiramiz
      await MockService.completeOrder(id);

      // 2. Lokal state'ni majburan yangilaymiz (Optimistic update)
      // Bu foydalanuvchiga darhol natijani ko'rsatish uchun
      setMyOrders(prev => prev.map(o =>
        o.id === id ? { ...o, status: OrderStatus.COMPLETED } : o
      ));

      setProcessingId(null);

      // 3. To'liq ma'lumotni qayta yuklaymiz
      await loadOrders();

      // 4. Tarix tabiga o'tkazamiz
      setActiveTab('HISTORY');
    }
  };

  const handleChatWithCustomer = (customerId: string) => {
    openChatWith(CURRENT_WORKER_ID, customerId, navigate);
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

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-900 p-6 sticky top-0 z-10 shadow-sm border-b border-gray-100 dark:border-gray-800">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Mening Ishlarim</h1>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'ACTIVE' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Faol ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'HISTORY' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Tarix ({historyOrders.length})
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center pt-20">
            <Loader2 className="animate-spin text-blue-600" size={32} />
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
                ) : (
                  <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-lg text-[10px] font-bold uppercase">
                    Bajarildi
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
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 mt-3">
                  <span className="text-xs text-gray-400">Narx:</span>
                  <span className="font-bold text-lg text-green-600 dark:text-green-400">
                    {order.price.toLocaleString()} so'm
                  </span>
                </div>
              </div>

              {activeTab === 'ACTIVE' && (
                <div className="pl-3 space-y-3">
                  {/* Chat button */}
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

                    {(order.status === OrderStatus.IN_PROGRESS || order.status === OrderStatus.ACCEPTED) && (
                      <button
                        onClick={() => handleCompleteJob(order.id)}
                        disabled={order.status === OrderStatus.ACCEPTED || processingId === order.id}
                        className={`flex-1 font-bold py-3.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 disabled:opacity-50 ${order.status === OrderStatus.ACCEPTED
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white shadow-green-500/30'
                          }`}
                      >
                        {processingId === order.id ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
                        <span>Tugatish</span>
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
    </div>
  );
};