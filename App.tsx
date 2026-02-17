
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import { CustomerHome } from './pages/customer/CustomerHome';
import { CreateOrder } from './pages/customer/CreateOrder';
import { MyOrders } from './pages/customer/MyOrders';
import { JobFeed } from './pages/worker/JobFeed';
import { MyJobs } from './pages/worker/MyJobs';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminFinance } from './pages/admin/AdminFinance';
import { ChatPage } from './pages/ChatPage';
import { MapFinder } from './pages/MapFinder';
import { TelegramRegister } from './pages/TelegramRegister';
import { User, UserRole } from './types';
import { ApiService } from './services/api';
import { requestUserLocation, getSavedLocation, isLocationStale, hasValidSavedLocation, LocationData } from './services/locationService';
import { initTelegramWebApp, isTelegramWebApp, getTelegramUser, getTelegramInitData } from './services/telegram';
import { LocationGate } from './components/LocationGate';
import { BannedScreen } from './components/BannedScreen';

const App = () => {
  const [user, setUser] = useState<User | null>(() => {
    // Try sessionStorage first (tab-specific), then localStorage (for persistence)
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) return JSON.parse(sessionUser);

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      // Copy to sessionStorage for this tab
      sessionStorage.setItem('currentUser', savedUser);
      return JSON.parse(savedUser);
    }

    return null;
  });

  const [userLocation, setUserLocation] = useState<LocationData | null>(() => getSavedLocation());
  const [locationReady, setLocationReady] = useState<boolean>(() => hasValidSavedLocation());

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [showTelegramRegister, setShowTelegramRegister] = useState(false);
  const [telegramRegistrationData, setTelegramRegistrationData] = useState<{ initData: string; tgUser: any } | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);

  // Telegram Web App initialization + auto-login
  useEffect(() => {
    if (!isTelegramWebApp()) return;

    const initialized = initTelegramWebApp();
    if (!initialized) return;

    const initData = getTelegramInitData();
    const tgUser = getTelegramUser();

    if (!initData || !tgUser) {
      return;
    }

    // Telegram WebApp'da har doim server'dan auth qilish
    // (bot orqali ro'yxatdan o'tgan bo'lsa, cached session eski bo'lishi mumkin)
    setTelegramLoading(true);

    ApiService.telegramAuth(initData)
      .then((result: any) => {
        if (result.user) {
          // Foydalanuvchi topildi — avtomatik login
          // Eski cached session bilan bir xil bo'lsa ham, yangilash
          handleLogin(result.user);
          toast.success(`Xush kelibsiz, ${result.user.name}!`, { autoClose: 2000 });
        } else if (result.isNewUser) {
          // Yangi foydalanuvchi — eski cached session'ni tozalash
          sessionStorage.removeItem('currentUser');
          localStorage.removeItem('currentUser');
          setUser(null);
          // Ro'yxatdan o'tish formasi
          setTelegramRegistrationData({ initData, tgUser });
          setShowTelegramRegister(true);
        }
      })
      .catch((err: any) => {
        console.error('Telegram auth error:', err);
        toast.error('Telegram avtorizatsiya xatosi', { autoClose: 3000 });
      })
      .finally(() => {
        setTelegramLoading(false);
      });
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Ban statusini tekshirish — har safar app ochilganda serverdan yangilash
  useEffect(() => {
    if (!user) return;
    ApiService.getUserById(user.id).then((freshUser) => {
      if (freshUser && freshUser.isBanned) {
        const updatedUser = { ...user, isBanned: true, blockReason: freshUser.blockReason, blockedUntil: freshUser.blockedUntil, blockedAt: freshUser.blockedAt };
        setUser(updatedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      } else if (freshUser && user.isBanned && !freshUser.isBanned) {
        // Unban bo'lgan bo'lsa — yangilash
        const updatedUser = { ...user, isBanned: false, blockReason: undefined, blockedUntil: undefined, blockedAt: undefined };
        setUser(updatedUser);
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }
    }).catch(() => {});
  }, [user?.id]);

  // Fonda joylashuvni yangilash — faqat gate o'tilgandan keyin
  useEffect(() => {
    if (user && locationReady && isLocationStale(userLocation)) {
      requestUserLocation()
        .then((location) => {
          setUserLocation(location);
          if (user && location.lat && location.lng) {
            ApiService.updateUser(user.id, {
              location: { lat: location.lat, lng: location.lng }
            } as any).catch(err => console.error('Location update error:', err));
          }
        })
        .catch(() => {});
    }
  }, [user, locationReady]);

  // LocationGate dan joylashuv qabul qilinganda
  const handleLocationGranted = (location: LocationData) => {
    setUserLocation(location);
    setLocationReady(true);
    if (user && location.lat && location.lng) {
      ApiService.updateUser(user.id, {
        location: { lat: location.lat, lng: location.lng }
      } as any).catch(err => console.error('Location update error:', err));
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleLogin = async (loggedInUser: User) => {
    // Null tekshiruvi
    if (!loggedInUser) {
      console.error('handleLogin called with null user');
      return;
    }

    // Check if another user is already logged in
    if (user && user.id !== loggedInUser.id) {
      const confirmSwitch = window.confirm(
        `Siz allaqachon ${user.name} ${user.surname} sifatida login qilgansiz.\n\n` +
        `Yangi foydalanuvchi (${loggedInUser.name} ${loggedInUser.surname}) bilan login qilmoqchimisiz?\n\n` +
        `⚠️ Eslatma: Bir brauzerda faqat bitta foydalanuvchi login bo'lishi mumkin. ` +
        `Bir nechta foydalanuvchilarni test qilish uchun Incognito tab yoki boshqa brauzer ishlatishingiz mumkin.`
      );

      if (!confirmSwitch) {
        return; // User cancelled, don't proceed with login
      }
    }

    // Avtomatik ravishda foydalanuvchini onlayn qilish va locationni yuborish
    try {
      const savedLoc = getSavedLocation();
      const updateData: any = { isOnline: true };
      if (savedLoc && savedLoc.lat && savedLoc.lng) {
        updateData.location = { lat: savedLoc.lat, lng: savedLoc.lng };
      }
      await ApiService.updateUser(loggedInUser.id, updateData);
      loggedInUser.isOnline = true;
    } catch (error) {
      console.error('Could not set user online:', error);
    }

    setUser(loggedInUser);
    // Save to sessionStorage (tab-specific)
    sessionStorage.setItem('currentUser', JSON.stringify(loggedInUser));
    // Also save to localStorage for persistence across page refreshes
    localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
  };

  const handleLogout = async () => {
    // Foydalanuvchini offline qilish
    if (user) {
      try {
        await ApiService.updateUser(user.id, { isOnline: false } as any);
      } catch (error) {
        console.error('Could not set user offline:', error);
      }
    }
    setUser(null);
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    // Clear any session data for complete cleanup
    sessionStorage.clear();
  };

  const handleUserUpdate = (updatedUser: User) => {
    console.log('App: handleUserUpdate called with:', updatedUser);
    // Force new object reference to ensure React detects change
    setUser({ ...updatedUser });
    sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  // Heartbeat — har 2 daqiqada "men tirikman" signali + sahifa yopilganda offline
  useEffect(() => {
    if (!user) return;

    // Heartbeat yuborish
    const heartbeat = setInterval(() => {
      ApiService.sendHeartbeat(user.id);
    }, 2 * 60 * 1000); // Har 2 daqiqada

    // Darhol birinchi heartbeat
    ApiService.sendHeartbeat(user.id);

    // Sahifa yopilganda offline qilish
    const handleBeforeUnload = () => {
      // sendBeacon ishonchli — brauzer yopilayotganda ham yuboriladi
      const url = `${process.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${user.id}/offline`;
      navigator.sendBeacon(url, JSON.stringify({}));
    };

    // Visibility change — tab yopilganda
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const url = `${process.env.VITE_API_URL || 'http://localhost:5000/api'}/users/${user.id}/offline`;
        navigator.sendBeacon(url, JSON.stringify({}));
      } else if (document.visibilityState === 'visible') {
        ApiService.sendHeartbeat(user.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id]);

  const role = user?.role || null;

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} theme={isDarkMode ? 'dark' : 'light'} aria-label="Notifications" />
      {telegramLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Telegram orqali kirish...</p>
          </div>
        </div>
      )}
      <Routes>
        {!user && showTelegramRegister && telegramRegistrationData ? (
          <Route path="*" element={
            <TelegramRegister
              initData={telegramRegistrationData.initData}
              tgUser={telegramRegistrationData.tgUser}
              onRegister={(registeredUser: User) => {
                setShowTelegramRegister(false);
                setTelegramRegistrationData(null);
                handleLogin(registeredUser);
              }}
              onLogin={handleLogin}
            />
          } />
        ) : !user ? (
          <Route path="*" element={<Auth onLogin={handleLogin} />} />
        ) : (
          <Route
            path="*"
            element={
              <Layout user={user} logout={handleLogout} toggleTheme={toggleTheme} isDarkMode={isDarkMode}>
                {/* Banned Screen — bloklangan foydalanuvchi uchun */}
                {user.isBanned && role !== UserRole.ADMIN ? (
                  <BannedScreen
                    reason={user.blockReason}
                    blockedUntil={user.blockedUntil}
                    blockedAt={user.blockedAt}
                    onLogout={handleLogout}
                  />
                ) : !locationReady && role !== UserRole.ADMIN ? (
                  <LocationGate onLocationGranted={handleLocationGranted} />
                ) : (
                  <Routes>
                    {/* Admin Routes */}
                    {role === UserRole.ADMIN && (
                      <>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/users" element={<AdminUsers />} />
                        <Route path="/admin/orders" element={<AdminOrders />} />
                        <Route path="/admin/finance" element={<AdminFinance />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                      </>
                    )}

                    {/* Customer Routes */}
                    {role === UserRole.CUSTOMER && (
                      <>
                        <Route path="/customer/home" element={<CustomerHome />} />
                        <Route path="/customer/create" element={<CreateOrder />} />
                        <Route path="/customer/orders" element={<MyOrders />} />
                        <Route path="/map" element={<MapFinder />} />
                        <Route path="/profile" element={<Profile user={user} logout={handleLogout} toggleTheme={toggleTheme} isDarkMode={isDarkMode} onUserUpdate={handleUserUpdate} />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="*" element={<Navigate to="/customer/home" replace />} />
                      </>
                    )}

                    {/* Worker Routes */}
                    {role === UserRole.WORKER && (
                      <>
                        <Route path="/worker/home" element={<JobFeed />} />
                        <Route path="/worker/orders" element={<MyJobs />} />
                        <Route path="/map" element={<MapFinder />} />
                        <Route path="/profile" element={<Profile user={user} logout={handleLogout} toggleTheme={toggleTheme} isDarkMode={isDarkMode} onUserUpdate={handleUserUpdate} />} />
                        <Route path="/chat" element={<ChatPage />} />
                        <Route path="*" element={<Navigate to="/worker/home" replace />} />
                      </>
                    )}
                  </Routes>
                )}
              </Layout>
            }
          />
        )}
      </Routes>
    </Router>
  );
};

export default App;
