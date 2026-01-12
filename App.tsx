
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
import { User, UserRole } from './types';
import { ApiService } from './services/api';
import { requestUserLocation, getSavedLocation, isLocationStale, LocationData } from './services/locationService';
import { initTelegramWebApp, isTelegramWebApp, getTelegramUser } from './services/telegram';

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

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Telegram Web App initialization
  useEffect(() => {
    if (isTelegramWebApp()) {
      const initialized = initTelegramWebApp();
      if (initialized) {
        toast.success('📱 Telegram orqali ulandi!', { autoClose: 2000 });

        // Get Telegram user info
        const tgUser = getTelegramUser();
        if (tgUser) {
          console.log('Telegram User:', tgUser);
          // You can auto-login or show user info here
        }
      }
    }
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

  // Joylashuvni so'rash - foydalanuvchi login bo'lgandan keyin
  useEffect(() => {
    if (user && isLocationStale(userLocation)) {
      // Joylashuvni so'rash
      toast.info('📍 Joylashuvingiz aniqlanmoqda...', { autoClose: 2000 });

      requestUserLocation()
        .then((location) => {
          setUserLocation(location);
          toast.success(`📍 Joylashuv: ${location.city}, ${location.district || location.country}`, {
            autoClose: 3000
          });
        })
        .catch((error) => {
          console.error('Location error:', error);
          toast.warn('📍 Joylashuvni aniqlab bo\'lmadi. Default manzil ishlatilmoqda.', {
            autoClose: 3000
          });
        });
    }
  }, [user]);

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

    // Avtomatik ravishda foydalanuvchini onlayn qilish
    try {
      await ApiService.updateUser(loggedInUser.id, { isOnline: true } as any);
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

  const role = user?.role || null;

  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} theme={isDarkMode ? 'dark' : 'light'} aria-label="Notifications" />
      <Routes>
        {!user ? (
          <Route path="*" element={<Auth onLogin={handleLogin} />} />
        ) : (
          <Route
            path="*"
            element={
              <Layout user={user} logout={handleLogout} toggleTheme={toggleTheme} isDarkMode={isDarkMode}>
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
                      <Route path="/customer/map" element={<MapFinder />} />
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
                      <Route path="/profile" element={<Profile user={user} logout={handleLogout} toggleTheme={toggleTheme} isDarkMode={isDarkMode} onUserUpdate={handleUserUpdate} />} />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="*" element={<Navigate to="/worker/home" replace />} />
                    </>
                  )}
                </Routes>
              </Layout>
            }
          />
        )}
      </Routes>
    </Router>
  );
};

export default App;
