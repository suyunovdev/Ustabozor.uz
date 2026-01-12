import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
  LogOut, Bell, CreditCard, ChevronRight, ShieldCheck,
  User as UserIcon, Star, Briefcase, MapPin, Moon, Sun,
  CheckCircle2, Camera, Award, TrendingUp, Calendar, Zap,
  Instagram, Send, Globe, Wifi, WifiOff
} from 'lucide-react';
import { EditProfileModal } from '../components/EditProfileModal';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { LocationModal } from '../components/LocationModal';
import { WalletModal } from '../components/WalletModal';
import { JobsStatsModal } from '../components/JobsStatsModal';
import { ApiService } from '../services/api';
import { toast } from 'react-toastify';
import { getSavedLocation, LocationData } from '../services/locationService';

interface ProfileProps {
  user: User;
  logout: () => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  onUserUpdate: (user: User) => void;
}

export const Profile: React.FC<ProfileProps> = ({ user, logout, toggleTheme, isDarkMode, onUserUpdate }) => {
  console.log('Profile: Rendered with user:', user);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showJobsStatsModal, setShowJobsStatsModal] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(() => getSavedLocation());
  const [platformStats, setPlatformStats] = useState({
    totalOrders: 0,
    todayOrders: 0,
    totalWorkers: 0
  });

  // Platform statistikasini yuklash
  useEffect(() => {
    const loadPlatformStats = async () => {
      try {
        const [orders, workers] = await Promise.all([
          ApiService.getOrders(),
          ApiService.getWorkers()
        ]);

        // Bugungi buyurtmalarni hisoblash
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o =>
          new Date(o.createdAt).toDateString() === today
        ).length;

        setPlatformStats({
          totalOrders: orders.length,
          todayOrders,
          totalWorkers: workers.length
        });
      } catch (error) {
        console.error('Failed to load platform stats:', error);
      }
    };

    loadPlatformStats();
  }, []);

  const handleLocationChange = (location: LocationData) => {
    setUserLocation(location);
  };

  const handleUpdateProfile = async (updatedData: Partial<User> | FormData) => {
    if (!user.id) return;
    try {
      const updatedUser = await ApiService.updateUser(user.id, updatedData);
      if (updatedUser) {
        onUserUpdate(updatedUser);
        toast.success("Profil muvaffaqiyatli yangilandi!");
      } else {
        toast.error("Foydalanuvchi topilmadi. Iltimos, qaytadan tizimga kiring.");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Server bilan aloqa yo'q.");
    }
  };

  const achievements = [
    { id: 1, label: "Yangi A'zo", icon: UserIcon, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30" },
    { id: 2, label: "Verifikatsiya", icon: ShieldCheck, color: "text-green-500 bg-green-100 dark:bg-green-900/30" },
    { id: 3, label: "5 Yulduz", icon: Star, color: "text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30" },
    { id: 4, label: "Tezkor", icon: Zap, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30" },
  ];

  const StatCard = ({ label, value, icon: Icon, color, delay, subtext, trend, onClick }: any) => {
    const bgColor = color === 'text-green-600' ? 'bg-emerald-500' :
      color === 'text-yellow-500' ? 'bg-amber-500' : 'bg-blue-500';
    const lightBg = color === 'text-green-600' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
      color === 'text-yellow-500' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20';

    return (
      <div
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-lg border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1 cursor-pointer group`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className={`${lightBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={24} className={color} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {label === 'Hamyon' && <span className="text-base text-gray-500 mr-1">UZS</span>}
                {value}
              </span>
              {label === 'Reyting' && <span className="text-lg">⭐</span>}
              {trend && (
                <span className={`flex items-center gap-0.5 text-xs font-bold ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  <TrendingUp size={12} className={trend > 0 ? '' : 'rotate-180'} />
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</p>
            {subtext && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtext}</p>
            )}
          </div>

          {/* Arrow */}
          {onClick && (
            <ChevronRight size={20} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
          )}
        </div>
      </div>
    );
  };

  const MenuItem = ({ icon: Icon, label, onClick, subLabel, isDestructive = false, delay }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 mb-2 rounded-2xl transition-all duration-200 group animate-fadeInUp
        ${isDestructive
          ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20'
          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700'
        }
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center space-x-4">
        <div className={`p-2.5 rounded-xl transition-colors ${isDestructive ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'}`}>
          <Icon size={20} className={isDestructive ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'} />
        </div>
        <div className="text-left">
          <span className="block font-semibold text-base">{label}</span>
          {subLabel && subLabel !== 'toggle' && <span className="text-xs text-gray-400 font-medium">{subLabel}</span>}
        </div>
      </div>

      {subLabel === 'toggle' ? (
        <div className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
          <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}>
            {isDarkMode ? (
              <Moon size={12} className="text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            ) : (
              <Sun size={12} className="text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>
      ) : (
        <div className={`p-1 rounded-full ${isDestructive ? 'bg-red-100 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'} transition-colors`}>
          <ChevronRight size={18} className={`${isDestructive ? 'text-red-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-blue-500'} transition-colors`} />
        </div>
      )}
    </button>
  );

  const isValidUrl = (url: string | undefined) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

      {/* Modern Header */}
      <div className="relative mb-24">
        <div className="h-72 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:from-blue-900 dark:via-indigo-900 dark:to-gray-900 rounded-b-[3rem] shadow-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/20"></div>

          {/* Decorative Circles */}
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>

        {/* Profile Card Overlay */}
        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/4 w-[90%] max-w-md">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-white/20 dark:border-gray-700/50 flex flex-col items-center">
            <div className="relative -mt-16 mb-4 group">
              <div className="w-28 h-28 rounded-full border-4 border-white dark:border-gray-800 shadow-2xl overflow-hidden bg-gray-200 dark:bg-gray-700 ring-4 ring-blue-500/20 dark:ring-blue-400/10">
                <img src={isValidUrl(user.avatar) ? user.avatar : `https://ui-avatars.com/api/?name=${user.name}&background=0D8ABC&color=fff`} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <button className="absolute bottom-1 right-1 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors border-2 border-white dark:border-gray-800">
                <Camera size={14} />
              </button>
            </div>

            <div className="text-center w-full">
              <div className="flex items-center justify-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name} {user.surname}</h1>
                <CheckCircle2 size={20} className="text-blue-500 fill-blue-50 dark:fill-blue-900/30" />
              </div>
              <button
                onClick={() => setShowLocationModal(true)}
                className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1 flex items-center justify-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer group"
              >
                <MapPin size={14} className="group-hover:scale-110 transition-transform" />
                {userLocation?.city || 'Toshkent'}, {userLocation?.district || userLocation?.country || "O'zbekiston"}
                <span className="text-xs text-blue-500 ml-1">(o'zgartirish)</span>
              </button>

              {/* Profile Completion Bar */}
              <div className="mt-4 w-full max-w-[200px] mx-auto">
                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400 mb-1">
                  <span>Profil to'ldirilganligi</span>
                  <span>85%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-[85%] rounded-full"></div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm
                   ${user.role === UserRole.WORKER
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    : user.role === UserRole.CUSTOMER
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }
                 `}>
                  {user.role === UserRole.WORKER ? 'Mutaxassis' : user.role === UserRole.CUSTOMER ? 'Buyurtmachi' : 'Admin'}
                </span>
                <span className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-bold flex items-center gap-1">
                  <Star size={12} className="fill-current" /> {user.rating || '5.0'}
                </span>
                {user.role === UserRole.WORKER && (
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${(user as any).isOnline
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${(user as any).isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                    {(user as any).isOnline ? 'Online' : 'Offline'}
                  </span>
                )}
                <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs font-bold flex items-center gap-1">
                  <Calendar size={12} /> 2024
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 mb-6 mt-24 space-y-3">
        <StatCard
          label="Hamyon"
          value={`${(user.balance || 0).toLocaleString()}`}
          icon={CreditCard}
          color="text-green-600"
          delay={100}
          subtext="Kartalar va operatsiyalar"
          onClick={() => setShowWalletModal(true)}
        />
        <StatCard
          label="Reyting"
          value={user.rating || '5.0'}
          icon={Star}
          color="text-yellow-500"
          delay={200}
          subtext={`${user.ratingCount || 0} ta baho`}
        />
        <StatCard
          label="Ishlar"
          value={user.role === UserRole.WORKER ? '124' : '15'}
          icon={Briefcase}
          color="text-blue-600"
          delay={300}
          subtext={user.role === UserRole.WORKER ? 'Bajarilgan ishlar' : 'Buyurtmalar soni'}
          onClick={() => setShowJobsStatsModal(true)}
        />
      </div>

      {/* Platform Stats Banner */}
      <div className="px-6 mb-8 animate-fadeInUp" style={{ animationDelay: '350ms' }}>
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white/20 rounded-full blur-xl"></div>
          <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/80 uppercase tracking-wider">Platforma Statistikasi</p>
                <p className="text-sm font-bold">
                  {platformStats.todayOrders > 0
                    ? `Bugun ${platformStats.todayOrders} ta yangi ish! 🚀`
                    : `Jami ${platformStats.totalOrders} ta ish platformada 🎯`
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="text-center px-2">
                <p className="text-xl font-black">{platformStats.totalOrders}</p>
                <p className="text-[10px] text-white/70 uppercase">Ishlar</p>
              </div>
              <div className="w-px bg-white/20"></div>
              <div className="text-center px-2">
                <p className="text-xl font-black">{platformStats.totalWorkers}</p>
                <p className="text-[10px] text-white/70 uppercase">Ustalar</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="px-6 mb-8 animate-fadeInUp" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Award size={16} className="text-yellow-500" /> Yutuqlar
          </h3>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Barchasi</span>
        </div>
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
          {achievements.map((ach) => (
            <div key={ach.id} className="flex-shrink-0 flex flex-col items-center space-y-2">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${ach.color} shadow-sm`}>
                <ach.icon size={24} />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{ach.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Settings */}
      <div className="px-6 space-y-6">
        {/* Profile Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Profil</h3>
          <MenuItem icon={UserIcon} label="Shaxsiy ma'lumotlar" subLabel="Tahrirlash" onClick={() => setShowEditProfile(true)} delay={500} />
          <MenuItem icon={MapPin} label="Joylashuv" subLabel={userLocation?.city || "O'zgartirish"} onClick={() => setShowLocationModal(true)} delay={550} />
          <MenuItem icon={Bell} label="Bildirishnomalar" subLabel="Ko'rish" onClick={() => setShowNotifications(true)} delay={600} />
        </div>

        {/* Worker Status Section */}
        {user.role === UserRole.WORKER && (
          <div>
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Ish holati</h3>
            <MenuItem
              icon={(user as any).isOnline ? Wifi : WifiOff}
              label={(user as any).isOnline ? 'Ish qabul qilmoqda' : 'Ish qabul qilmayapti'}
              subLabel={(user as any).isOnline ? 'Online - ishlar sizga ko\'rsatiladi' : "Offline - ishlar sizga ko'rsatilmaydi"}
              onClick={async () => {
                const updated = await ApiService.toggleOnlineStatus(user.id);
                if (updated) {
                  onUserUpdate(updated);
                  toast.success((updated as any).isOnline ? "Online rejimga o'tdingiz!" : "Offline rejimga o'tdingiz!");
                }
              }}
              delay={650}
            />
          </div>
        )}

        {/* App Settings Section */}
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4 px-2">Ilova</h3>
          <MenuItem
            icon={isDarkMode ? Moon : Sun}
            label={isDarkMode ? 'Tungi rejim' : 'Kunduzgi rejim'}
            subLabel="toggle"
            onClick={toggleTheme}
            delay={700}
          />
        </div>

        {/* Logout */}
        <div className="pt-2">
          <MenuItem icon={LogOut} label="Chiqish" isDestructive={true} onClick={() => setShowLogoutConfirm(true)} delay={800} />
        </div>
      </div>

      {/* Footer Socials */}
      <div className="mt-12 mb-6 text-center">
        <div className="flex justify-center space-x-6 mb-4">
          <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors"><Send size={20} /></a>
          <a href="#" className="text-gray-400 hover:text-pink-500 transition-colors"><Instagram size={20} /></a>
          <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors"><Globe size={20} /></a>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 font-medium">IshTop Platformasi</p>
        <p className="text-[10px] text-gray-300 dark:text-gray-700 mt-1">v1.2.0 • Build 2024</p>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl scale-100 transition-all animate-scaleIn border border-gray-100 dark:border-gray-800">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 ring-8 ring-red-50/50 dark:ring-red-900/10">
              <LogOut size={36} />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-3">Chiqish</h3>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
              Haqiqatan ham hisobingizdan chiqmoqchimisiz? Keyingi safar kirish uchun parolingiz kerak bo'ladi.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="py-3.5 rounded-xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={logout}
                className="py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg shadow-red-500/30 transition-all transform hover:scale-[1.02]"
              >
                Ha, chiqish
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        user={user}
        onSave={handleUpdateProfile}
      />
      {/* Notifications Panel */}
      <NotificationsPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        userId={user.id}
      />
      {/* Location Modal */}
      <LocationModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationChange={handleLocationChange}
      />
      {/* Wallet Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        balance={user.balance || 0}
        onBalanceUpdate={(newBalance) => {
          onUserUpdate({ ...user, balance: newBalance });
        }}
      />
      {/* Jobs Stats Modal */}
      <JobsStatsModal
        isOpen={showJobsStatsModal}
        onClose={() => setShowJobsStatsModal(false)}
        user={user}
      />
    </div>
  );
};