import React, { useEffect, useState } from 'react';
import { Hammer, Zap, Search, Star, MapPin } from '../../components/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { MockService } from '../../services/mockDb';
import { WorkerProfile } from '../../types';
import { openChatWith } from '../../services/chatUtils';
import { MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { getSavedLocation, requestUserLocation, LocationData } from '../../services/locationService';

const CATEGORIES = [
  { id: 1, name: 'Santexnika', icon: <div className="text-blue-500 dark:text-blue-400">🚿</div>, color: 'bg-blue-50 dark:bg-blue-900/20' },
  { id: 2, name: 'Elektr', icon: <div className="text-yellow-500 dark:text-yellow-400">💡</div>, color: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { id: 3, name: 'Tozalash', icon: <div className="text-purple-500 dark:text-purple-400">✨</div>, color: 'bg-purple-50 dark:bg-purple-900/20' },
  { id: 4, name: 'Yuk tashish', icon: <div className="text-orange-500 dark:text-orange-400">📦</div>, color: 'bg-orange-50 dark:bg-orange-900/20' },
  { id: 5, name: 'Qurilish', icon: <div className="text-gray-500 dark:text-gray-400">🧱</div>, color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 6, name: 'Bog\'bon', icon: <div className="text-green-500 dark:text-green-400">🌿</div>, color: 'bg-green-50 dark:bg-green-900/20' },
  { id: 7, name: 'Dasturlash', icon: <div className="text-indigo-500 dark:text-indigo-400">💻</div>, color: 'bg-indigo-50 dark:bg-indigo-900/20' },
  { id: 8, name: 'Dizayn', icon: <div className="text-pink-500 dark:text-pink-400">🎨</div>, color: 'bg-pink-50 dark:bg-pink-900/20' },
  { id: 9, name: 'SMM', icon: <div className="text-cyan-500 dark:text-cyan-400">📱</div>, color: 'bg-cyan-50 dark:bg-cyan-900/20' },
];

export const CustomerHome = () => {
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const navigate = useNavigate();

  // Get current user
  const currentUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  useEffect(() => {
    MockService.getWorkers().then(setWorkers);
    // Joylashuvni olish
    setUserLocation(getSavedLocation());
  }, []);

  const handleChatWithWorker = async (workerId: string) => {
    if (!currentUser) {
      toast.warning("Ishchi bilan bog'lanish uchun avval tizimga kiring!");
      navigate('/auth');
      return;
    }

    console.log('🔗 Starting chat with worker:', workerId);
    console.log('👤 Current user:', currentUser.id);

    await openChatWith(currentUser.id, workerId, navigate);
  };

  const handleFixLocation = async () => {
    try {
      const location = await requestUserLocation();
      setUserLocation(location);
    } catch {}
  };

  return (
    <div className="pb-6">
      {/* Joylashuv ogohlantirishi */}
      {!userLocation && (
        <div className="mx-4 mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800/50 flex items-center gap-3">
          <MapPin size={20} className="text-orange-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Joylashuv aniqlanmagan</p>
            <p className="text-xs text-orange-500 dark:text-orange-400">Yaqin ishchilarni ko'rish uchun joylashuvni sozlang</p>
          </div>
          <button
            onClick={handleFixLocation}
            className="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg flex-shrink-0"
          >
            Sozlash
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-gray-900 px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-blue-100 dark:text-gray-400 text-sm">Manzil</p>
              <div className="flex items-center font-semibold text-lg">
                <MapPin size={18} className="mr-1 text-blue-200" />
                {userLocation ? `${userLocation.city}${userLocation.district ? `, ${userLocation.district}` : ''}` : "Toshkent, O'zbekiston"}
              </div>
            </div>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
              <span className="font-bold">{currentUser?.name?.charAt(0) || 'U'}{currentUser?.surname?.charAt(0) || ''}</span>
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-6 leading-tight">Bugun qanday xizmat<br />kerak?</h1>

          <div className="relative group">
            <input
              type="text"
              placeholder="Xizmatlarni qidirish..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none shadow-lg shadow-blue-900/20 dark:shadow-black/30 placeholder-gray-400 dark:placeholder-gray-500 transition-shadow focus:shadow-xl focus:ring-2 focus:ring-blue-400/50 dark:focus:ring-blue-500/50 border-none"
            />
            <Search className="absolute left-4 top-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20} />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 mt-8">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Kategoriyalar</h2>
        <div className="grid grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <Link to={`/customer/create?cat=${cat.name}`} key={cat.id} className="flex flex-col items-center group">
              <div className={`w-18 h-18 aspect-square w-full p-4 ${cat.color} rounded-2xl flex items-center justify-center text-3xl shadow-sm mb-2 transition-transform group-hover:scale-105 border border-transparent dark:border-white/5`}>
                {cat.icon}
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Top Workers List */}
      <div className="px-6 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Ishchilar</h2>
          <Link to="/customer/map" className="text-blue-600 dark:text-blue-400 text-sm font-medium">Xaritada ko'rish</Link>
        </div>

        <div className="space-y-4">
          {workers.map((worker) => (
            <div key={worker.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center space-x-4 relative">
              <div className="relative">
                <img
                  src={worker.avatar || `https://ui-avatars.com/api/?name=${worker.name}`}
                  className="w-14 h-14 rounded-xl object-cover ring-2 ring-gray-100 dark:ring-gray-700"
                  alt="worker"
                />
                {/* REAL-TIME ONLINE STATUS INDICATOR */}
                {worker.isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full shadow-sm animate-pulse"></div>
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white">{worker.name} {worker.surname?.charAt(0)}.</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {worker.skills[0]} • {worker.isOnline ? <span className="text-green-500 font-bold">Online</span> : 'Offline'}
                </p>
                <div className="flex items-center mt-1">
                  <Star size={12} className="text-yellow-400 fill-current" />
                  <span className="text-xs font-bold ml-1 text-gray-800 dark:text-gray-200">{worker.rating}</span>
                  <span className="text-xs text-gray-400 ml-1">({worker.ratingCount} baho)</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleChatWithWorker(worker.id)}
                  className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                  title="Xabar yuborish"
                >
                  <MessageCircle size={20} />
                </button>
                <button
                  onClick={() => navigate(`/customer/create?workerId=${worker.id}&workerName=${worker.name}`)}
                  className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Yollash
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};