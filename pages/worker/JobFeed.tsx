import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MockService } from '../../services/mockDb';
import { ApiService } from '../../services/api';
import { Order, OrderStatus, User, WorkerProfile } from '../../types';
import {
  MapPin, DollarSign, Clock, CheckCircle, Search, Filter, Star,
  MessageCircle, Bookmark, BookmarkCheck, RefreshCw, TrendingUp,
  ChevronDown, Zap, Map, List, X, Briefcase, Award
} from '../../components/Icons';
import { MapView, MapMarker } from '../../components/MapView';
import { NavigationModal } from '../../components/NavigationModal';
import { getSavedLocation, requestUserLocation, LocationData } from '../../services/locationService';
import { openChatWith } from '../../services/chatUtils';

// ====== YORDAMCHI FUNKSIYALAR ======

// Nisbiy vaqtni hisoblash
const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Hozirgina";
  if (diffMins < 60) return `${diffMins} daqiqa oldin`;
  if (diffHours < 24) return `${diffHours} soat oldin`;
  if (diffDays < 7) return `${diffDays} kun oldin`;
  return date.toLocaleDateString('uz-UZ');
};

// Masofani hisoblash (km)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Kategoriyalar ro'yxati
const CATEGORIES = [
  'Barchasi', 'Santexnika', 'Elektr', 'Tozalash', 'Yuk tashish',
  'Qurilish', "Bo'yoqchi", "Bog'bon", 'Haydovchi', 'Remont',
  'Dasturlash', 'Dizayn', 'SMM', 'Tarjima', 'IT Yordam', 'Boshqa'
];

// Saralash opsiyalari
type SortOption = 'newest' | 'price_high' | 'price_low' | 'nearest';
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Eng yangi' },
  { value: 'price_high', label: 'Eng qimmat' },
  { value: 'price_low', label: 'Eng arzon' },
  { value: 'nearest', label: 'Eng yaqin' }
];

// Kengaytirilgan Order tipi
interface ExtendedOrder extends Order {
  customerInfo?: User;
  distance?: number;
  aiMatch?: boolean;
}

export const JobFeed = () => {
  // ====== STATE ======
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Radius filter - masofa bo'yicha (km)
  const [radiusFilter, setRadiusFilter] = useState<number | null>(null); // null = cheksiz
  const RADIUS_OPTIONS = [
    { value: null, label: 'Barchasi', icon: '🌍' },
    { value: 5, label: '5 km', icon: '📍' },
    { value: 10, label: '10 km', icon: '🏃' },
    { value: 25, label: '25 km', icon: '🚗' },
  ];

  // Bookmarks - localStorage dan yuklash
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem('jobBookmarks');
    return saved ? JSON.parse(saved) : [];
  });
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [allOrders, setAllOrders] = useState<ExtendedOrder[]>([]); // Barcha buyurtmalar (bookmarks uchun)

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasRealLocation, setHasRealLocation] = useState(false);

  // Navigation Modal State
  const [navigationTarget, setNavigationTarget] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Worker Stats
  const [workerStats, setWorkerStats] = useState({
    completedJobs: 0,
    totalEarnings: 0,
    todayEarnings: 0,
    acceptRate: 0
  });

  // Current user
  const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) as WorkerProfile : null;
  const CURRENT_WORKER_ID = currentUser?.id;
  const workerSkills = currentUser?.skills || [];

  // ====== DATA FETCHING ======

  // Buyurtmani boyitish funksiyasi
  const enrichOrder = async (order: Order): Promise<ExtendedOrder> => {
    let customerInfo: User | undefined;
    try {
      customerInfo = await ApiService.getUserById(order.customerId);
    } catch (e) {
      // ignore
    }

    // AI Match - ko'nikmalar bilan solishtirish
    const aiMatch = workerSkills.some(skill =>
      order.category.toLowerCase().includes(skill.toLowerCase()) ||
      order.title.toLowerCase().includes(skill.toLowerCase()) ||
      order.description.toLowerCase().includes(skill.toLowerCase())
    );

    // Masofani hisoblash - HAQIQIY koordinatalardan
    let distance: number | undefined;
    if (userLocation && order.lat && order.lng) {
      // Buyurtmada haqiqiy koordinatalar bor
      distance = calculateDistance(userLocation.lat, userLocation.lng, order.lat, order.lng);
    } else if (userLocation) {
      // Eski buyurtmalar uchun - koordinatalar yo'q, masofa ko'rsatilmaydi
      distance = undefined;
    }

    return { ...order, customerInfo, aiMatch, distance };
  };

  const fetchOrders = useCallback(async () => {
    try {
      const data = await MockService.getOrders();

      // Barcha buyurtmalarni saqlash (bookmarks uchun)
      const allEnrichedOrders = await Promise.all(data.map(enrichOrder));
      setAllOrders(allEnrichedOrders);

      // Faqat PENDING buyurtmalarni asosiy ro'yxatga
      const pendingOrders = allEnrichedOrders.filter(o => o.status === OrderStatus.PENDING);
      setOrders(pendingOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [workerSkills, userLocation]);

  const fetchWorkerStats = useCallback(async () => {
    if (!CURRENT_WORKER_ID) return;
    try {
      const allOrders = await MockService.getOrders();
      const myCompletedOrders = allOrders.filter(
        o => o.workerId === CURRENT_WORKER_ID && o.status === OrderStatus.COMPLETED
      );
      const totalEarnings = myCompletedOrders.reduce((sum, o) => sum + o.price, 0);

      // Bugungi daromad
      const today = new Date().toDateString();
      const todayOrders = myCompletedOrders.filter(
        o => new Date(o.createdAt).toDateString() === today
      );
      const todayEarnings = todayOrders.reduce((sum, o) => sum + o.price, 0);

      setWorkerStats({
        completedJobs: myCompletedOrders.length,
        totalEarnings,
        todayEarnings,
        acceptRate: myCompletedOrders.length > 0 ? 95 : 0
      });
    } catch (error) {
      console.error('Error fetching worker stats:', error);
    }
  }, [CURRENT_WORKER_ID]);

  // Initial load
  useEffect(() => {
    fetchOrders();
    fetchWorkerStats();

    // Get user location from localStorage (already requested on login)
    const savedLocation = getSavedLocation();
    if (savedLocation) {
      setUserLocation({ lat: savedLocation.lat, lng: savedLocation.lng });
      setHasRealLocation(true);
    } else {
      // Fallback: Tashkent default
      setUserLocation({ lat: 41.311081, lng: 69.240562 });
      setHasRealLocation(false);
    }

    // Worker status
    MockService.getWorkers().then(workers => {
      const me = workers.find(w => w.id === CURRENT_WORKER_ID);
      if (me) setIsOnline(me.isOnline);
    });
  }, []);

  // Real-time polling (30 sekund)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ====== FILTERED & SORTED ORDERS ======

  const filteredOrders = useMemo(() => {
    // Saqlangan ishlar ko'rsatilayotganda BARCHA buyurtmalardan filtrlash
    // Aks holda faqat PENDING buyurtmalardan
    let result = showBookmarksOnly
      ? [...allOrders].filter(o => bookmarks.includes(o.id))
      : [...orders];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.location.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q)
      );
    }

    // Category
    if (selectedCategory !== 'Barchasi') {
      result = result.filter(o =>
        o.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Price range
    result = result.filter(o => o.price >= priceRange[0] && o.price <= priceRange[1]);

    // Radius filter - masofa bo'yicha
    if (radiusFilter !== null && userLocation) {
      result = result.filter(o => {
        if (!o.distance) return true; // Agar masofa yo'q bo'lsa, ko'rsatamiz
        return o.distance <= radiusFilter;
      });
    }

    // Sort
    switch (sortBy) {
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'nearest':
        result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // AI matches birinchi
    result.sort((a, b) => (b.aiMatch ? 1 : 0) - (a.aiMatch ? 1 : 0));

    return result;
  }, [orders, allOrders, searchQuery, selectedCategory, priceRange, sortBy, showBookmarksOnly, bookmarks, radiusFilter, userLocation]);

  // ====== HANDLERS ======

  const handleToggleStatus = async () => {
    if (!CURRENT_WORKER_ID) {
      alert("Iltimos, avval tizimga kiring!");
      return;
    }
    setLoading(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      const updatedWorker = await MockService.toggleWorkerStatus(CURRENT_WORKER_ID);
      if (updatedWorker) {
        setIsOnline(updatedWorker.isOnline);
      }
    } catch (error) {
      console.error("Error toggling status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    await fetchWorkerStats();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleAccept = async (id: string) => {
    if (!CURRENT_WORKER_ID) {
      alert("Iltimos, avval tizimga kiring!");
      return;
    }
    if (currentUser?.isBanned) {
      alert("Hisobingiz bloklangan. Ish qabul qilish mumkin emas.");
      return;
    }
    if (!isOnline) {
      alert("Ish qabul qilish uchun avval 'Online' rejimiga o'ting!");
      return;
    }
    await MockService.acceptOrder(id, CURRENT_WORKER_ID);
    setOrders(prev => prev.filter(o => o.id !== id));
    alert("Ish qabul qilindi! 'Ishlarim' bo'limini tekshiring.");
  };

  const toggleBookmark = (orderId: string, orderTitle?: string) => {
    const isCurrentlyBookmarked = bookmarks.includes(orderId);
    const newBookmarks = isCurrentlyBookmarked
      ? bookmarks.filter(id => id !== orderId)
      : [...bookmarks, orderId];

    setBookmarks(newBookmarks);
    localStorage.setItem('jobBookmarks', JSON.stringify(newBookmarks));

    // Toast xabari
    if (isCurrentlyBookmarked) {
      toast.info('🗑️ Saqlanganlardan o\'chirildi', { autoClose: 2000 });
    } else {
      toast.success(`⭐ "${orderTitle || 'Ish'}" saqlandi!`, { autoClose: 2000 });
    }
  };

  const handleQuickChat = async (customerId: string) => {
    if (!CURRENT_WORKER_ID) {
      toast.warning("Chat uchun tizimga kiring!");
      navigate('/auth');
      return;
    }
    await openChatWith(CURRENT_WORKER_ID, customerId, navigate);
  };

  // ====== RENDER ======

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24">

      {/* Joylashuv ogohlantirishi */}
      {!hasRealLocation && (
        <div className="mx-4 mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800/50 flex items-center gap-3">
          <MapPin size={20} className="text-orange-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Joylashuv aniqlanmagan</p>
            <p className="text-xs text-orange-500 dark:text-orange-400">Masofa to'g'ri hisoblanishi uchun GPS ruxsat bering</p>
          </div>
          <button
            onClick={async () => {
              try {
                const loc = await requestUserLocation();
                setUserLocation({ lat: loc.lat, lng: loc.lng });
                setHasRealLocation(true);
              } catch {}
            }}
            className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg flex-shrink-0"
          >
            GPS
          </button>
        </div>
      )}

      {/* ===== HEADER & STATS ===== */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-gray-900 p-6 text-white">
        {/* Top row */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold">Salom, {currentUser?.name || 'Ishchi'}! 👋</h1>
            <p className="text-blue-100 text-sm">Yangi ishlarni topib, daromad qiling</p>
          </div>

          {/* Online/Offline Toggle */}
          <button
            onClick={handleToggleStatus}
            disabled={loading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${isOnline
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
              : 'bg-white/20 text-white'
              }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
            <span>{loading ? '...' : (isOnline ? 'Online' : 'Offline')}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <TrendingUp size={18} className="mx-auto mb-1 opacity-80" />
            <p className="text-lg font-bold">{workerStats.todayEarnings.toLocaleString()}</p>
            <p className="text-[10px] opacity-70">Bugun</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Briefcase size={18} className="mx-auto mb-1 opacity-80" />
            <p className="text-lg font-bold">{workerStats.completedJobs}</p>
            <p className="text-[10px] opacity-70">Bajarilgan</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
            <Award size={18} className="mx-auto mb-1 opacity-80" />
            <p className="text-lg font-bold">{workerStats.acceptRate}%</p>
            <p className="text-[10px] opacity-70">Reyting</p>
          </div>
        </div>
      </div>

      {/* ===== SEARCH & FILTERS ===== */}
      <div className="bg-white dark:bg-gray-900 p-4 sticky top-0 z-20 shadow-sm border-b border-gray-100 dark:border-gray-800">

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Ish qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={16} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Filter Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className={`p-2 bg-gray-100 dark:bg-gray-800 rounded-lg ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} className="text-gray-500 dark:text-gray-400" />
          </button>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm border-0 dark:text-white"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Bookmarks Toggle */}
          <button
            onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
            className={`p-2 rounded-lg relative ${showBookmarksOnly ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}
          >
            {showBookmarksOnly ? <BookmarkCheck size={18} className="text-yellow-600" /> : <Bookmark size={18} className="text-gray-400" />}
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
          >
            {viewMode === 'list' ? <Map size={18} className="text-gray-500 dark:text-gray-400" /> : <List size={18} className="text-gray-500 dark:text-gray-400" />}
          </button>

          {/* More Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg ${showFilters ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}
          >
            <Filter size={18} className={showFilters ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'} />
          </button>
        </div>

        {/* Price Filter (collapsible) */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl mb-3 animate-fadeIn">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
              Narx oralig'i: {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()} so'm
            </label>
            <input
              type="range"
              min={0}
              max={10000000}
              step={100000}
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              className="w-full accent-blue-500"
            />
          </div>
        )}

        {/* Category Pills */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${selectedCategory === cat
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Radius Filter - Masofa bo'yicha */}
        <div className="mt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">📍 Masofa bo'yicha:</p>
          <div className="flex space-x-2 overflow-x-auto no-scrollbar">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.label}
                onClick={() => setRadiusFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-1 ${radiusFilter === opt.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                  }`}
              >
                <span>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== MAP VIEW ===== */}
      {viewMode === 'map' && (
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              🗺️ Xaritada {filteredOrders.length} ta ish ko'rsatilmoqda
            </p>
            <button
              onClick={() => setViewMode('list')}
              className="text-xs text-blue-500 hover:underline"
            >
              Ro'yxatga qaytish
            </button>
          </div>
          <MapView
            height="400px"
            markers={filteredOrders.map(order => {
              // Use actual GPS coordinates if available, otherwise default to Tashkent
              const lat = order.lat || 41.311081;
              const lng = order.lng || 69.240562;

              return {
                id: order.id,
                position: [lat, lng] as [number, number],
                title: order.title,
                description: order.description,
                price: order.price,
                category: order.category,
                type: 'job' as const,
                onClick: () => {
                  toast.info(`📍 ${order.title} - ${order.location}`);
                }
              };
            })}
            onMarkerClick={(marker) => {
              console.log('Clicked marker:', marker);
            }}
            showUserLocation={true}
          />
        </div>
      )}

      {/* ===== JOB CARDS ===== */}
      <div className="p-4 space-y-4">
        {/* Results count */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filteredOrders.length} ta ish topildi
          {searchQuery && ` "${searchQuery}" uchun`}
          {radiusFilter && ` (${radiusFilter} km ichida)`}
        </p>

        {filteredOrders.map(order => (
          <div
            key={order.id}
            className={`bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border transition-all duration-300 hover:shadow-md ${order.aiMatch
              ? 'border-green-200 dark:border-green-800 ring-2 ring-green-100 dark:ring-green-900/30'
              : 'border-gray-100 dark:border-gray-800'
              }`}
          >
            {/* Top row */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {order.category}
                </span>
                {/* Status badge - faqat saqlanganlarda ko'rsatiladi */}
                {showBookmarksOnly && order.status !== OrderStatus.PENDING && (
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${order.status === OrderStatus.COMPLETED
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : order.status === OrderStatus.ACCEPTED || order.status === OrderStatus.IN_PROGRESS
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>
                    {order.status === OrderStatus.COMPLETED ? '✓ Bajarilgan'
                      : order.status === OrderStatus.IN_PROGRESS ? '⏳ Jarayonda'
                        : order.status === OrderStatus.ACCEPTED ? '📋 Qabul qilingan'
                          : order.status}
                  </span>
                )}
                {order.aiMatch && (
                  <span className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                    <Zap size={10} /> Sizga mos
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock size={12} className="mr-1" />
                  {getRelativeTime(order.createdAt)}
                </span>
                <button onClick={() => toggleBookmark(order.id, order.title)} className="p-1 hover:scale-110 transition-transform">
                  {bookmarks.includes(order.id)
                    ? <BookmarkCheck size={16} className="text-yellow-500" />
                    : <Bookmark size={16} className="text-gray-300 hover:text-yellow-500" />
                  }
                </button>
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 leading-snug">{order.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{order.description}</p>

            {/* Customer Info */}
            {order.customerInfo && (
              <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                  {order.customerInfo.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{order.customerInfo.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="flex items-center"><Star size={10} className="text-yellow-500 mr-0.5" /> {order.customerInfo.rating?.toFixed(1) || '5.0'}</span>
                    <span>•</span>
                    <span>{order.customerInfo.ratingCount || 0} ta baho</span>
                  </div>
                </div>
              </div>
            )}

            {/* Location & Price */}
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300 mb-4">
              <button
                onClick={() => {
                  if (order.lat && order.lng) {
                    setNavigationTarget({
                      name: order.location,
                      lat: order.lat,
                      lng: order.lng
                    });
                  } else {
                    // Koordinatalar yo'q - xabar berish
                    toast.warning('Bu buyurtma uchun aniq joylashuv mavjud emas');
                  }
                }}
                className="flex items-center text-left hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
              >
                <MapPin size={14} className={`mr-1.5 ${order.lat && order.lng ? 'text-green-500' : 'text-gray-400'} group-hover:text-blue-500 group-hover:scale-110 transition-all`} />
                <span className="underline-offset-2 group-hover:underline">{order.location}</span>
                {order.distance !== undefined ? (
                  <span className="ml-1 text-blue-500 font-medium">({order.distance.toFixed(1)} km)</span>
                ) : order.lat && order.lng ? (
                  <span className="ml-1 text-green-500 text-[10px]">✓ GPS</span>
                ) : null}
              </button>
              <div className="flex items-center text-green-600 dark:text-green-400 font-bold text-sm">
                <DollarSign size={14} className="mr-1" />
                {order.price.toLocaleString()} so'm
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Quick Chat */}
              <button
                onClick={() => handleQuickChat(order.customerId)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                Yozish
              </button>

              {/* Accept */}
              <button
                onClick={() => handleAccept(order.id)}
                disabled={!isOnline}
                className={`flex-[2] py-3 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${isOnline
                  ? 'bg-black dark:bg-white text-white dark:text-black hover:opacity-90'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
              >
                <CheckCircle size={16} />
                {isOnline ? 'Qabul qilish' : "Avval Online bo'ling"}
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
              {showBookmarksOnly ? <Bookmark size={32} className="text-gray-400" /> : <CheckCircle size={32} className="text-gray-400" />}
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {showBookmarksOnly ? "Saqlangan ishlar yo'q" : "Hozircha yangi ishlar yo'q."}
            </p>
            {(searchQuery || selectedCategory !== 'Barchasi') && (
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('Barchasi'); setShowBookmarksOnly(false); }}
                className="mt-3 text-blue-500 text-sm underline"
              >
                Filtrlarni tozalash
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Modal */}
      {navigationTarget && (
        <NavigationModal
          isOpen={!!navigationTarget}
          onClose={() => setNavigationTarget(null)}
          destinationName={navigationTarget.name}
          destinationLat={navigationTarget.lat}
          destinationLng={navigationTarget.lng}
        />
      )}
    </div>
  );
};