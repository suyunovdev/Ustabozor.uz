
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, MapPin, PlusCircle, MessageSquare, User as UserIcon, LogOut, Briefcase, Sun, Moon, History } from './Icons';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  logout: () => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const MobileNav = ({ role }: { role: UserRole }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const baseClass = "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs font-medium transition-colors duration-200";
  const activeClass = "text-blue-600 dark:text-blue-400";
  const inactiveClass = "text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300";

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 pb-safe">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
        <Link to={`/${role.toLowerCase()}/home`} className={`${baseClass} ${isActive(`/${role.toLowerCase()}/home`) ? activeClass : inactiveClass}`}>
          <Home size={20} />
          <span>Asosiy</span>
        </Link>
        
        {role === UserRole.CUSTOMER ? (
          <Link to="/customer/orders" className={`${baseClass} ${isActive('/customer/orders') ? activeClass : inactiveClass}`}>
            <History size={20} />
            <span>Tarix</span>
          </Link>
        ) : (
           <Link to="/worker/orders" className={`${baseClass} ${isActive('/worker/orders') ? activeClass : inactiveClass}`}>
            <Briefcase size={20} />
            <span>Ishlarim</span>
          </Link>
        )}

        <Link to={role === UserRole.CUSTOMER ? "/customer/create" : "/worker/home"} className="flex flex-col items-center justify-center w-full h-full -mt-5">
          <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full shadow-lg shadow-blue-500/30 text-white ring-4 ring-white dark:ring-gray-900 transition-transform active:scale-95">
            <PlusCircle size={28} />
          </div>
        </Link>

        <Link to="/chat" className={`${baseClass} ${isActive('/chat') ? activeClass : inactiveClass}`}>
          <MessageSquare size={20} />
          <span>Chat</span>
        </Link>

        <Link to="/profile" className={`${baseClass} ${isActive('/profile') ? activeClass : inactiveClass}`}>
          <UserIcon size={20} />
          <span>Profil</span>
        </Link>
      </div>
    </nav>
  );
};

const AdminSidebar = ({ logout, toggleTheme, isDarkMode, user }: { logout: () => void, toggleTheme: () => void, isDarkMode: boolean, user: User }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  
  const links = [
    { path: '/admin/dashboard', icon: <Home size={20} />, label: 'Boshqaruv' },
    { path: '/admin/users', icon: <UserIcon size={20} />, label: 'Foydalanuvchilar' },
    { path: '/admin/orders', icon: <Briefcase size={20} />, label: 'Buyurtmalar' },
    { path: '/admin/finance', icon: <MapPin size={20} />, label: 'Moliya' },
  ];

  return (
    <div className="hidden md:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen transition-colors duration-300">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">Mardikor<span className="text-gray-400 text-xs ml-1 font-normal uppercase tracking-widest">Admin</span></h1>
        <div className="flex items-center space-x-3 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
           <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-8 h-8 rounded-full" alt="admin" />
           <div className="text-xs">
              <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-gray-500">Administrator</p>
           </div>
        </div>
      </div>
      <div className="flex-1 py-6 space-y-1">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center px-6 py-3 space-x-3 border-l-4 transition-all ${
              isActive(link.path) 
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {link.icon}
            <span>{link.label}</span>
          </Link>
        ))}
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
         <button 
           onClick={toggleTheme}
           className="flex items-center space-x-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg w-full px-4 py-2 transition-colors"
         >
           {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
           <span>{isDarkMode ? 'Kunduzgi rejim' : 'Tungi rejim'}</span>
         </button>
         <button onClick={logout} className="flex items-center space-x-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg w-full px-4 py-2 transition-colors">
           <LogOut size={20} />
           <span>Chiqish</span>
         </button>
      </div>
    </div>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, user, logout, toggleTheme, isDarkMode }) => {
  if (!user) return <>{children}</>;

  if (user.role === UserRole.ADMIN) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <AdminSidebar logout={logout} toggleTheme={toggleTheme} isDarkMode={isDarkMode} user={user} />
        <main className="flex-1 overflow-y-auto h-screen p-8 scroll-smooth">
          {children}
        </main>
      </div>
    );
  }

  // Mobile App Layout
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex justify-center transition-colors duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 min-h-screen shadow-2xl dark:shadow-black/50 relative pb-20 transition-colors duration-300 overflow-hidden">
        {/* Mobile Header Toggle */}
        {location.pathname !== '/profile' && (
          <div className="absolute top-4 right-4 z-40">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-sm border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200"
            >
              {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
          </div>
        )}
        
        {children}
        <MobileNav role={user.role} />
      </div>
    </div>
  );
};
