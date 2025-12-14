import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockDb';
import { Order, OrderStatus } from '../../types';
import { Clock, CheckCircle, XCircle, MapPin, Loader2, Star, X } from '../../components/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { openChatWith } from '../../services/chatUtils';
import { MessageCircle } from 'lucide-react';

export const MyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Get current user
  const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  const loadOrders = () => {
    MockService.getOrders().then(data => {
      if (currentUser) {
        const myOrders = data.filter(o => o.customerId === currentUser.id);
        myOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(myOrders);
      }
      setIsLoading(false);
    });
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
    }
  };

  const handleChatWithWorker = (workerId: string) => {
    if (currentUser) {
      openChatWith(currentUser.id, workerId, navigate);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const styles = {
      [OrderStatus.PENDING]: "bg-yellow-100 text-yellow-800",
      [OrderStatus.ACCEPTED]: "bg-blue-100 text-blue-800",
      [OrderStatus.IN_PROGRESS]: "bg-purple-100 text-purple-800",
      [OrderStatus.COMPLETED]: "bg-green-100 text-green-800",
      [OrderStatus.CANCELLED]: "bg-red-100 text-red-800",
    };
    return (
      <span className={`${styles[status]} dark:bg-opacity-20 text-[10px] font-bold px-2 py-1 rounded-full flex items-center`}>
        {status}
      </span>
    );
  };

  if (isLoading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24">
      <div className="bg-white dark:bg-gray-900 p-6 sticky top-0 z-10 shadow-sm border-b border-gray-100 dark:border-gray-800 transition-colors">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Buyurtmalarim</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Jami {orders.length} ta buyurtma</p>
      </div>

      <div className="p-4 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-all hover:shadow-md">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${order.status === OrderStatus.COMPLETED ? 'bg-green-500' :
              order.status === OrderStatus.IN_PROGRESS ? 'bg-purple-500' : 'bg-gray-300'
              }`}></div>

            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{order.title}</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</p>
              </div>
              {getStatusBadge(order.status)}
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{order.description}</p>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">{order.price.toLocaleString()} so'm</div>

            {/* Chat button for orders with assigned workers */}
            {order.workerId && (order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.IN_PROGRESS || order.status === OrderStatus.COMPLETED) && (
              <button
                onClick={() => handleChatWithWorker(order.workerId!)}
                className="w-full bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 py-2 px-4 rounded-xl font-medium shadow-sm hover:shadow-md transition-all mb-3 flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800"
              >
                <MessageCircle size={18} />
                Ishchi bilan bog'lanish
              </button>
            )}

            {order.status === OrderStatus.COMPLETED && !order.review && (
              <button
                onClick={() => openReviewModal(order.id)}
                className="w-full bg-yellow-500 text-white py-2 rounded-xl font-bold shadow-lg hover:bg-yellow-600 transition-colors"
              >
                Baholash
              </button>
            )}
            {order.review && (
              <div className="text-sm text-green-600 flex items-center font-medium">
                <CheckCircle size={16} className="mr-2" /> Baholandi ({order.review.rating} ball)
              </div>
            )}
          </div>
        ))}
      </div>

      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-slideUp sm:animate-scaleIn relative border border-gray-100 dark:border-gray-800">
            <button onClick={() => setReviewModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={24} /></button>
            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">Xizmatni baholang</h3>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">Usta xizmati sizga ma'qul bo'ldimi?</p>

            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110 focus:outline-none">
                  <Star size={36} className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-200 dark:text-gray-700'} />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Izoh qoldiring..."
              className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
            />

            <button
              onClick={handleSubmitReview}
              disabled={rating === 0}
              className="w-full bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30"
            >
              Yuborish
            </button>
          </div>
        </div>
      )}
    </div>
  );
};