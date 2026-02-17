import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { MockService } from '../services/mockDb';
import { OrderStatus } from '../types';
import { MapView, MapMarker } from '../components/MapView';
import { OrderTimeline } from '../components/OrderTimeline';
import { openChatWith } from '../services/chatUtils';
import { toast } from 'react-toastify';
import {
    ArrowLeft, MapPin, Calendar, Clock, CheckCircle, XCircle, Loader2,
    Phone, MessageCircle, Star, Play, Flag, Briefcase, User as UserIcon,
    ChevronRight, BadgeCheck, Banknote
} from 'lucide-react';

const isValidLocation = (lat?: number, lng?: number): boolean => {
    if (lat === undefined || lng === undefined) return false;
    return lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: Clock, label: 'Kutilmoqda' },
    ACCEPTED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: BadgeCheck, label: 'Qabul qilindi' },
    IN_PROGRESS: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: Loader2, label: 'Jarayonda' },
    COMPLETED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle, label: 'Bajarildi' },
    CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle, label: 'Bekor qilindi' },
};

export const OrderDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [similarOrders, setSimilarOrders] = useState<any[]>([]);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false);

    const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const isWorker = currentUser?.role === 'WORKER';
    const isCustomer = currentUser?.role === 'CUSTOMER';
    const isMyOrder = currentUser?.id === (order?.customerId?.id || order?.customerId) ||
                      currentUser?.id === (order?.workerId?.id || order?.workerId);

    useEffect(() => {
        if (!id) return;
        loadOrder();
    }, [id]);

    const loadOrder = async () => {
        setLoading(true);
        try {
            const data = await ApiService.getOrderById(id!);
            if (!data) {
                toast.error("Buyurtma topilmadi");
                navigate(-1);
                return;
            }
            setOrder(data);
            loadSimilarOrders(data.category, data.id || data._id);
        } catch {
            toast.error("Xatolik yuz berdi");
            navigate(-1);
        } finally {
            setLoading(false);
        }
    };

    const loadSimilarOrders = async (category: string, currentId: string) => {
        try {
            const allOrders = await ApiService.getOrders();
            const similar = allOrders
                .filter(o => o.category === category && o.id !== currentId && o.status === OrderStatus.PENDING)
                .slice(0, 4);
            setSimilarOrders(similar);
        } catch { /* ignore */ }
    };

    // Helpers
    const getOrderId = () => order?.id || order?._id || id;
    const getCustomer = () => typeof order?.customerId === 'object' ? order.customerId : null;
    const getWorker = () => typeof order?.workerId === 'object' ? order.workerId : null;
    const getCustomerId = () => order?.customerId?.id || order?.customerId?._id || order?.customerId;
    const getWorkerId = () => order?.workerId?.id || order?.workerId?._id || order?.workerId;

    // Actions
    const handleAccept = async () => {
        if (!currentUser?.id) return;
        if (currentUser?.isBanned) { toast.error("Siz bloklangansiz"); return; }
        setActionLoading(true);
        try {
            await MockService.acceptOrder(getOrderId(), currentUser.id);
            toast.success("Buyurtma qabul qilindi!");
            loadOrder();
        } catch (e: any) {
            toast.error(e.message || "Xatolik");
        } finally { setActionLoading(false); }
    };

    const handleStart = async () => {
        setActionLoading(true);
        try {
            await MockService.startOrder(getOrderId());
            toast.success("Ish boshlandi!");
            loadOrder();
        } catch (e: any) {
            toast.error(e.message || "Xatolik");
        } finally { setActionLoading(false); }
    };

    const handleComplete = async () => {
        setActionLoading(true);
        try {
            await MockService.completeOrder(getOrderId());
            toast.success("Ish tugallandi! To'lov hisobingizga o'tkazildi.");
            loadOrder();
        } catch (e: any) {
            toast.error(e.message || "Xatolik");
        } finally { setActionLoading(false); }
    };

    const handleCancel = async () => {
        if (!confirm("Buyurtmani bekor qilmoqchimisiz?")) return;
        setActionLoading(true);
        try {
            await ApiService.updateOrder(getOrderId(), { status: 'CANCELLED' } as any);
            toast.success("Buyurtma bekor qilindi");
            loadOrder();
        } catch (e: any) {
            toast.error(e.message || "Xatolik");
        } finally { setActionLoading(false); }
    };

    const handleSubmitReview = async () => {
        if (rating === 0) { toast.error("Baho tanlang"); return; }
        setActionLoading(true);
        try {
            await MockService.submitReview(getOrderId(), rating, comment);
            toast.success("Baho qoldirildi!");
            setShowReviewForm(false);
            loadOrder();
        } catch (e: any) {
            toast.error(e.message || "Xatolik");
        } finally { setActionLoading(false); }
    };

    const handleChat = async (otherUserId: string) => {
        if (!currentUser?.id || !otherUserId) return;
        await openChatWith(currentUser.id, otherUserId, navigate);
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
    );

    if (!order) return null;

    const status = order.status as string;
    const sc = statusConfig[status] || statusConfig.PENDING;
    const StatusIcon = sc.icon;
    const customer = getCustomer();
    const worker = getWorker();
    const price = Number(order.price) || 0;
    const hasLocation = isValidLocation(order.lat, order.lng);
    const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    const mapMarkers: MapMarker[] = hasLocation ? [{
        id: getOrderId(),
        position: [order.lat, order.lng] as [number, number],
        title: order.title,
        description: order.location,
        price: price,
        type: 'job',
    }] : [];

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20">
                <div className="flex items-center justify-between p-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
                        <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <h1 className="text-base font-bold text-gray-900 dark:text-white">Buyurtma tafsiloti</h1>
                    <span className={`${sc.bg} ${sc.text} text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1`}>
                        <StatusIcon size={12} className={status === 'IN_PROGRESS' ? 'animate-spin' : ''} />
                        {sc.label}
                    </span>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Main Info */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    {order.category && (
                        <span className="inline-block text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full font-semibold mb-3">
                            {order.category}
                        </span>
                    )}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{order.title}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm leading-relaxed">{order.description}</p>

                    <div className="flex flex-wrap gap-3 mt-4 text-sm text-gray-500 dark:text-gray-400">
                        {order.location && (
                            <div className="flex items-center gap-1.5">
                                <MapPin size={14} className="text-red-500" />
                                <span>{order.location}</span>
                            </div>
                        )}
                        {createdDate && (
                            <div className="flex items-center gap-1.5">
                                <Calendar size={14} className="text-blue-500" />
                                <span>{createdDate}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Price */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-5 border border-green-100 dark:border-green-800/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase">Narxi</p>
                            <p className="text-3xl font-black text-green-700 dark:text-green-300 mt-1">{price.toLocaleString()} <span className="text-base font-medium">so'm</span></p>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <Banknote size={28} className="text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    {isWorker && (
                        <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/30 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-green-600/70">Komissiya (10%)</span>
                                <span className="text-red-500">-{(price * 0.1).toLocaleString()} so'm</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold">
                                <span className="text-green-700 dark:text-green-300">Sof daromad</span>
                                <span className="text-green-700 dark:text-green-300">{(price * 0.9).toLocaleString()} so'm</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Customer / Worker Info */}
                {isWorker && customer && (
                    <UserCard
                        label="Mijoz"
                        name={`${customer.name || ''} ${customer.surname || ''}`.trim() || "Noma'lum"}
                        avatar={customer.avatar}
                        phone={customer.phone}
                        rating={customer.rating}
                        onChat={() => handleChat(customer.id || customer._id)}
                    />
                )}
                {isCustomer && worker && (
                    <UserCard
                        label="Ishchi"
                        name={`${worker.name || ''} ${worker.surname || ''}`.trim() || "Noma'lum"}
                        avatar={worker.avatar}
                        phone={worker.phone}
                        rating={worker.rating}
                        ratingCount={worker.ratingCount}
                        onChat={() => handleChat(worker.id || worker._id)}
                    />
                )}

                {/* Mini Map */}
                {hasLocation && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                        <div className="p-4 pb-2">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MapPin size={16} className="text-red-500" />
                                Joylashuv
                            </h3>
                        </div>
                        <MapView height="200px" markers={mapMarkers} zoom={14} showUserLocation={false} />
                    </div>
                )}

                {/* Timeline */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Clock size={16} className="text-blue-500" />
                        Vaqt jadvali
                    </h3>
                    <OrderTimeline
                        createdAt={order.createdAt}
                        acceptedAt={order.acceptedAt}
                        startedAt={order.startedAt}
                        completedAt={order.completedAt}
                        status={order.status}
                    />
                </div>

                {/* Review */}
                {status === 'COMPLETED' && order.review && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Star size={16} className="text-yellow-500 fill-yellow-500" />
                            Baho
                        </h3>
                        <div className="flex items-center gap-1 mb-2">
                            {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} size={20} className={s <= order.review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
                            ))}
                            <span className="ml-2 text-sm font-bold text-gray-700 dark:text-gray-300">{order.review.rating}/5</span>
                        </div>
                        {order.review.comment && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{order.review.comment}"</p>
                        )}
                    </div>
                )}

                {/* Review Form */}
                {status === 'COMPLETED' && !order.review && isCustomer && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                        {!showReviewForm ? (
                            <button
                                onClick={() => setShowReviewForm(true)}
                                className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                            >
                                <Star size={18} />
                                Ustani baholang
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Baho qoldiring</h3>
                                <div className="flex items-center gap-2 justify-center">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={s} onClick={() => setRating(s)} className="p-1 transition-transform hover:scale-110">
                                            <Star size={32} className={s <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300 dark:text-gray-600'} />
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                    placeholder="Izoh yozing (ixtiyoriy)..."
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <div className="flex gap-2">
                                    <button onClick={() => setShowReviewForm(false)} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-medium text-sm">
                                        Bekor
                                    </button>
                                    <button
                                        onClick={handleSubmitReview}
                                        disabled={actionLoading || rating === 0}
                                        className="flex-1 py-2.5 bg-yellow-500 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                                    >
                                        {actionLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Yuborish'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                    {/* Worker actions */}
                    {isWorker && status === 'PENDING' && (
                        <button
                            onClick={handleAccept}
                            disabled={actionLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> Qabul qilish</>}
                        </button>
                    )}
                    {isWorker && status === 'ACCEPTED' && getWorkerId() === currentUser?.id && (
                        <button
                            onClick={handleStart}
                            disabled={actionLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> Ishni boshlash</>}
                        </button>
                    )}
                    {isWorker && status === 'IN_PROGRESS' && getWorkerId() === currentUser?.id && (
                        <button
                            onClick={handleComplete}
                            disabled={actionLoading}
                            className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
                        >
                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <><Flag size={18} /> Tugatish va to'lov olish</>}
                        </button>
                    )}

                    {/* Customer actions */}
                    {isCustomer && status === 'PENDING' && getCustomerId() === currentUser?.id && (
                        <button
                            onClick={handleCancel}
                            disabled={actionLoading}
                            className="w-full py-3.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-800/30 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <><XCircle size={18} /> Bekor qilish</>}
                        </button>
                    )}

                    {/* Chat */}
                    {isMyOrder && status !== 'CANCELLED' && status !== 'PENDING' && (
                        <button
                            onClick={() => handleChat(isWorker ? getCustomerId() : getWorkerId())}
                            className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <MessageCircle size={18} />
                            Xabar yozish
                        </button>
                    )}
                </div>

                {/* Similar Orders */}
                {similarOrders.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Briefcase size={16} className="text-blue-500" />
                            O'xshash ishlar
                        </h3>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                            {similarOrders.map(o => (
                                <Link
                                    key={o.id}
                                    to={`/orders/${o.id}`}
                                    className="min-w-[220px] max-w-[220px] bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 shrink-0 snap-start hover:shadow-md transition-shadow"
                                >
                                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                                        {o.category}
                                    </span>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mt-2 truncate">{o.title}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{o.description}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-green-600 dark:text-green-400 font-bold text-sm">{o.price.toLocaleString()} so'm</span>
                                        <ChevronRight size={14} className="text-gray-400" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// User info card component
const UserCard = ({ label, name, avatar, phone, rating, ratingCount, onChat }: {
    label: string;
    name: string;
    avatar?: string;
    phone?: string;
    rating?: number;
    ratingCount?: number;
    onChat: () => void;
}) => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-400 uppercase font-bold mb-3">{label}</p>
        <div className="flex items-center gap-3">
            {avatar ? (
                <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" />
            ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                    {name.charAt(0)}
                </div>
            )}
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white truncate">{name}</h4>
                {rating != null && (
                    <div className="flex items-center gap-1 mt-0.5">
                        <Star size={13} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-500">{rating || '0.0'}{ratingCount != null ? ` (${ratingCount})` : ''}</span>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                {phone && (
                    <a href={`tel:${phone}`} className="p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                        <Phone size={18} className="text-green-600 dark:text-green-400" />
                    </a>
                )}
                <button onClick={onChat} className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <MessageCircle size={18} className="text-blue-600 dark:text-blue-400" />
                </button>
            </div>
        </div>
    </div>
);

export default OrderDetail;
