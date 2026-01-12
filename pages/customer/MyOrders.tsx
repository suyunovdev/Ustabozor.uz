import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockDb';
import { ApiService } from '../../services/api';
import { Order, OrderStatus, User } from '../../types';
import {
  Clock, CheckCircle, XCircle, MapPin, Loader2, Star, X,
  Calendar, DollarSign
} from '../../components/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { openChatWith } from '../../services/chatUtils';
import { MessageCircle, ChevronRight, Eye, Banknote, Clock3, BadgeCheck, ShoppingBag, AlertTriangle, CreditCard, Wallet, Package } from 'lucide-react';
import { toast } from 'react-toastify';
import { OrderTimeline } from '../../components/OrderTimeline';

interface ExtendedOrder extends Order {
  workerInfo?: User;
}

export const MyOrders = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED' | 'ALL'>('ALL');
  const navigate = useNavigate();

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'card'>('balance');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  const loadOrders = async () => {
    const data = await MockService.getOrders();
    if (currentUser) {
      const myOrders = data.filter(o => o.customerId === currentUser.id);
      myOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Load worker info for each order
      const ordersWithWorkerInfo: ExtendedOrder[] = await Promise.all(
        myOrders.map(async (order) => {
          let workerInfo: User | undefined;
          if (order.workerId) {
            try {
              workerInfo = await ApiService.getUserById(order.workerId);
            } catch (e) {
              console.error('Could not load worker info:', e);
            }
          }
          return { ...order, workerInfo };
        })
      );

      setOrders(ordersWithWorkerInfo);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const openReviewModal = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRating(0);
    setComment('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (selectedOrderId && rating > 0) {
      await MockService.submitReview(selectedOrderId, rating, comment);
      setReviewModalOpen(false);
      loadOrders();
      toast.success("Bahoingiz uchun rahmat! ⭐");
    }
  };

  const openPaymentModal = (order: ExtendedOrder) => {
    setSelectedOrder(order);
    setPaymentMethod('balance');
    setPaymentModalOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;

    setIsProcessingPayment(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulate payment processing

    if (paymentMethod === 'balance') {
      const newBalance = (currentUser?.balance || 0) - selectedOrder.price;
      if (newBalance < 0) {
        toast.error("Balansda yetarli mablag' yo'q!");
        setIsProcessingPayment(false);
        return;
      }

      await ApiService.updateUser(currentUser.id, { balance: newBalance } as any);
      const updatedUser = { ...currentUser, balance: newBalance };
      sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }

    // Update order status or mark as paid
    toast.success("To'lov muvaffaqiyatli amalga oshirildi! ✅");
    setPaymentModalOpen(false);
    setIsProcessingPayment(false);
    await loadOrders();
  };

  const handleChatWithWorker = async (workerId: string) => {
    if (!currentUser) {
      toast.warning("Chat uchun tizimga kiring!");
      navigate('/auth');
      return;
    }
    await openChatWith(currentUser.id, workerId, navigate);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm("Buyurtmani bekor qilmoqchimisiz?")) {
      await ApiService.updateOrder(orderId, { status: OrderStatus.CANCELLED });
      toast.info("Buyurtma bekor qilindi");
      await loadOrders();
    }
  };

  // Stats
  const totalSpent = orders
    .filter(o => o.status === OrderStatus.COMPLETED)
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  const activeOrders = orders.filter(o =>
    o.status === OrderStatus.PENDING ||
    o.status === OrderStatus.ACCEPTED ||
    o.status === OrderStatus.IN_PROGRESS
  );
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);

  // Filter orders
  const filteredOrders = activeTab === 'ALL'
    ? orders
    : activeTab === 'ACTIVE'
      ? activeOrders
      : completedOrders;

  const getStatusBadge = (status: OrderStatus) => {
    const styles: Record<OrderStatus, { bg: string; text: string; icon: any; label: string }> = {
      [OrderStatus.PENDING]: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: Clock3, label: 'Kutilmoqda' },
      [OrderStatus.ACCEPTED]: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: BadgeCheck, label: 'Qabul qilindi' },
      [OrderStatus.IN_PROGRESS]: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: Loader2, label: 'Jarayonda' },
      [OrderStatus.COMPLETED]: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle, label: 'Bajarildi' },
      [OrderStatus.CANCELLED]: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle, label: 'Bekor' },
    };

    const style = styles[status];
    const Icon = style.icon;

    return (
      <span className={`${style.bg} ${style.text} text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
        <Icon size={12} className={status === OrderStatus.IN_PROGRESS ? 'animate-spin' : ''} />
        {style.label}
      </span>
    );
  };

  if (isLoading) return (
    <div className="flex justify-center pt-20">
      <Loader2 className="animate-spin text-blue-600" size={32} />
    </div>
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24">
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 p-6 pb-20">
        <h1 className="text-xl font-bold text-white mb-1">Buyurtmalarim</h1>
        <p className="text-white/70 text-sm mb-6">Barcha buyurtmalaringiz</p>

        {/* Mini Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
            <p className="text-2xl font-bold text-white">{orders.length}</p>
            <p className="text-white/70 text-xs">Jami</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
            <p className="text-2xl font-bold text-white">{activeOrders.length}</p>
            <p className="text-white/70 text-xs">Faol</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
            <p className="text-2xl font-bold text-white">{(totalSpent / 1000).toFixed(0)}K</p>
            <p className="text-white/70 text-xs">Sarflangan</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-1.5 flex">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'ALL' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Barchasi
          </button>
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'ACTIVE' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Faol ({activeOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'COMPLETED' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Bajarilgan
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={40} className="text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-2">Buyurtmalar topilmadi</p>
            <Link to="/customer/home" className="text-blue-600 dark:text-blue-400 font-medium">
              Yangi buyurtma yarating →
            </Link>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              {/* Status Bar */}
              <div className={`h-1 ${order.status === OrderStatus.COMPLETED ? 'bg-green-500' :
                order.status === OrderStatus.IN_PROGRESS ? 'bg-purple-500' :
                  order.status === OrderStatus.ACCEPTED ? 'bg-blue-500' :
                    order.status === OrderStatus.PENDING ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>

              <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{order.title}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-2">
                      <Calendar size={12} />
                      {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                    </p>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{order.description}</p>

                {/* Location */}
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <MapPin size={14} className="mr-2" />
                  {order.location}
                </div>

                {/* Worker Info (if assigned) */}
                {order.workerInfo && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl mb-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      {order.workerInfo.avatar ? (
                        <img src={order.workerInfo.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {order.workerInfo.name?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{order.workerInfo.name}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Star size={12} className="text-yellow-500 mr-1" />
                        {order.workerInfo.rating?.toFixed(1) || '5.0'}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Usta</span>
                  </div>
                )}

                {/* Price */}
                <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">Narx:</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {order.price.toLocaleString()} UZS
                  </span>
                </div>

                {/* Vaqt jadvali */}
                <div className="mt-2">
                  <OrderTimeline
                    createdAt={order.createdAt}
                    acceptedAt={order.acceptedAt}
                    startedAt={order.startedAt}
                    completedAt={order.completedAt}
                    status={order.status}
                  />
                </div>

                {/* Actions */}
                <div className="space-y-2 mt-2">
                  {/* Chat button */}
                  {order.workerId && (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.IN_PROGRESS || order.status === OrderStatus.COMPLETED) && (
                    <button
                      onClick={() => handleChatWithWorker(order.workerId!)}
                      className="w-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <MessageCircle size={18} />
                      Ishchi bilan bog'lanish
                    </button>
                  )}

                  {/* Cancel button for pending orders */}
                  {order.status === OrderStatus.PENDING && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <XCircle size={18} />
                      Bekor qilish
                    </button>
                  )}

                  {/* Review button */}
                  {order.status === OrderStatus.COMPLETED && !order.review && (
                    <button
                      onClick={() => openReviewModal(order.id)}
                      className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 hover:from-yellow-600 hover:to-orange-600"
                    >
                      <Star size={18} />
                      Ustani baholang
                    </button>
                  )}

                  {/* Already reviewed */}
                  {order.review && (
                    <div className="flex items-center justify-center gap-2 py-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Baholandi - {order.review.rating}/5 ⭐
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slideUp sm:animate-scaleIn relative border border-gray-100 dark:border-gray-800">
            <button onClick={() => setReviewModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white">
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Xizmatni baholang</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Usta xizmati sizga ma'qul bo'ldimi?</p>
            </div>

            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star size={40} className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-200 dark:text-gray-700'} />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Izoh qoldiring..."
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-yellow-500 outline-none"
              rows={3}
            />

            <button
              onClick={handleSubmitReview}
              disabled={rating === 0}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/30"
            >
              Yuborish
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-slideUp">
            <button onClick={() => setPaymentModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Banknote size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">To'lovni amalga oshirish</h3>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-2">{selectedOrder.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrder.price.toLocaleString()} UZS</p>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentMethod('balance')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'balance' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <Wallet size={24} className="text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Balansdan</p>
                  <p className="text-sm text-gray-500">Joriy balans: {(currentUser?.balance || 0).toLocaleString()} UZS</p>
                </div>
                {paymentMethod === 'balance' && <CheckCircle size={20} className="text-green-500" />}
              </button>

              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <CreditCard size={24} className="text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Karta orqali</p>
                  <p className="text-sm text-gray-500">UzCard, HUMO, Visa</p>
                </div>
                {paymentMethod === 'card' && <CheckCircle size={20} className="text-blue-500" />}
              </button>
            </div>

            {/* Warning if not enough balance */}
            {paymentMethod === 'balance' && (currentUser?.balance || 0) < selectedOrder.price && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4 text-red-600 dark:text-red-400">
                <AlertTriangle size={18} />
                <span className="text-sm">Balansda yetarli mablag' yo'q</span>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={isProcessingPayment || (paymentMethod === 'balance' && (currentUser?.balance || 0) < selectedOrder.price)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
            >
              {isProcessingPayment ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Banknote size={20} />
                  To'lash - {selectedOrder.price.toLocaleString()} UZS
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};