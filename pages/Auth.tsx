
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { MockService } from '../services/mockDb';
import {
  Zap, ChevronRight, Loader2, User as UserIcon, Briefcase, TrendingUp,
  Camera, FileText, CheckCircle, Mail, Lock, Eye, EyeOff, X
} from '../components/Icons';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthView = 'LANDING' | 'LOGIN' | 'REGISTER' | 'ROLE_SELECT' | 'WORKER_SETUP';

// --- InputField Component (Moved OUTSIDE Auth to fix focus issue) ---
interface InputFieldProps {
  icon: React.ElementType;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  icon: Icon,
  type,
  placeholder,
  value,
  onChange,
  isPasswordToggle = false,
  showPassword = false,
  onTogglePassword,
  required = true
}) => (
  <div className="relative mb-4">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-gray-400" />
    </div>
    <input
      type={type}
      className="block w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
    />
    {isPasswordToggle && (
      <div
        className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
        onClick={onTogglePassword}
      >
        {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
      </div>
    )}
  </div>
);

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('LANDING');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register State
  const [regData, setRegData] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    password: ''
  });
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Worker Setup State
  const [workerSkills, setWorkerSkills] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState(1);

  // --- Handlers ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      const user = await MockService.login(loginEmail, loginPassword);
      onLogin(user);
    } catch (err) {
      setError('Email yoki parol noto\'g\'ri.');
      setIsLoading(false);
    }
  };

  const handleRegisterNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regData.name || !regData.email || !regData.password) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    setView('ROLE_SELECT');
  };

  const handleRoleSelect = async (role: UserRole) => {
    if (role === UserRole.WORKER) {
      setView('WORKER_SETUP');
    } else {
      setIsLoading(true);
      try {
        const newUser = await MockService.register({
          ...regData,
          role
        });
        if (newUser) {
          setTimeout(() => {
            onLogin(newUser);
          }, 1000);
        } else {
          setIsLoading(false);
          setError("Ro'yxatdan o'tishda xatolik. Keyinroq urinib ko'ring.");
        }
      } catch (e) {
        setIsLoading(false);
        setError("Server bilan bog'lanishda xatolik. Keyinroq urinib ko'ring.");
      }
    }
  };

  const handleWorkerSetupComplete = async () => {
    setIsLoading(true);
    try {
      const newUser = await MockService.register({
        ...regData,
        role: UserRole.WORKER,
        skills: workerSkills
      });
      if (newUser) {
        setTimeout(() => {
          onLogin(newUser);
        }, 1000);
      } else {
        setIsLoading(false);
        setError("Ro'yxatdan o'tishda xatolik. Keyinroq urinib ko'ring.");
      }
    } catch (e) {
      setIsLoading(false);
      setError("Server bilan bog'lanishda xatolik. Keyinroq urinib ko'ring.");
    }
  };

  const toggleSkill = (skill: string) => {
    if (workerSkills.includes(skill)) {
      setWorkerSkills(workerSkills.filter(s => s !== skill));
    } else {
      setWorkerSkills([...workerSkills, skill]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-6 overflow-hidden relative transition-colors duration-300">

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-br from-blue-600 to-indigo-900 dark:from-blue-900 dark:to-gray-950 rounded-b-[4rem] shadow-2xl z-0"></div>

      {/* Brand Section */}
      <div className={`z-10 text-center transition-all duration-500 ${view === 'LANDING' ? 'mt-0 mb-12' : 'mt-0 mb-6 scale-90'}`}>
        <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-2xl ring-4 ring-white/20 dark:ring-gray-700/30 backdrop-blur-sm animate-bounce-slow">
          <Zap size={48} strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-white mb-2">Mardikor</h1>
        <p className="text-blue-100 dark:text-gray-300 font-light text-lg">Ish toping. Yordam oling. Tez.</p>
      </div>

      {/* Main Content Area */}
      <div className="z-20 w-full max-w-md perspective-1000">

        {/* LANDING VIEW */}
        {view === 'LANDING' && (
          <div className="space-y-4 animate-fadeInUp">
            <button
              onClick={() => { setView('LOGIN'); setError(''); }}
              className="w-full bg-white dark:bg-gray-800 text-blue-600 dark:text-white font-bold text-lg py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
            >
              Kirish
            </button>
            <button
              onClick={() => { setView('REGISTER'); setError(''); }}
              className="w-full bg-blue-600/30 backdrop-blur-md border border-white/20 text-white font-bold text-lg py-4 rounded-2xl hover:bg-blue-600/40 transition-all duration-300"
            >
              Ro'yxatdan o'tish
            </button>
          </div>
        )}

        {/* LOGIN MODAL */}
        {view === 'LOGIN' && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl shadow-blue-900/20 dark:shadow-black/50 border border-gray-100 dark:border-gray-800 animate-scaleIn relative">
            <button onClick={() => setView('LANDING')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Xush kelibsiz</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg text-center font-medium border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <InputField
                icon={Mail}
                type="email"
                placeholder="Elektron pochta"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <InputField
                icon={Lock}
                type={showLoginPassword ? "text" : "password"}
                placeholder="Parol"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                isPasswordToggle
                showPassword={showLoginPassword}
                onTogglePassword={() => setShowLoginPassword(!showLoginPassword)}
              />

              <div className="flex justify-end mb-6">
                <button type="button" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Parolni unutdingizmi?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Kirish'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Hisobingiz yo'qmi?{' '}
              <button onClick={() => { setView('REGISTER'); setError(''); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Ro'yxatdan o'ting
              </button>
            </p>
          </div>
        )}

        {/* REGISTER MODAL */}
        {view === 'REGISTER' && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl shadow-blue-900/20 dark:shadow-black/50 border border-gray-100 dark:border-gray-800 animate-scaleIn relative">
            <button onClick={() => setView('LANDING')} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2">
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Ro'yxatdan o'tish</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">Ma'lumotlaringizni to'ldiring</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterNext}>
              <div className="grid grid-cols-2 gap-3">
                <InputField
                  icon={UserIcon}
                  type="text"
                  placeholder="Ism"
                  value={regData.name}
                  onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                />
                <InputField
                  icon={UserIcon}
                  type="text"
                  placeholder="Familiya"
                  value={regData.surname}
                  onChange={(e) => setRegData({ ...regData, surname: e.target.value })}
                />
              </div>

              <InputField
                icon={Mail}
                type="email"
                placeholder="Elektron pochta"
                value={regData.email}
                onChange={(e) => setRegData({ ...regData, email: e.target.value })}
              />

              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold text-sm">+998</span>
                </div>
                <input
                  type="tel"
                  className="block w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                  placeholder="90 123 45 67"
                  value={regData.phone}
                  onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                  required
                />
              </div>

              <InputField
                icon={Lock}
                type={showRegPassword ? "text" : "password"}
                placeholder="Parol yarating"
                value={regData.password}
                onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                isPasswordToggle
                showPassword={showRegPassword}
                onTogglePassword={() => setShowRegPassword(!showRegPassword)}
              />

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center mt-2"
              >
                Davom etish <ChevronRight size={20} className="ml-1" />
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
              Akkauntingiz bormi?{' '}
              <button onClick={() => { setView('LOGIN'); setError(''); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Kirish
              </button>
            </p>
          </div>
        )}

        {/* ROLE SELECTION VIEW */}
        {view === 'ROLE_SELECT' && (
          <div className="space-y-4 animate-fadeIn">
            <button onClick={() => setView('REGISTER')} className="text-white mb-2 flex items-center text-sm hover:underline"><ChevronRight className="rotate-180 mr-1" size={16} /> Ortga</button>
            <h2 className="text-2xl font-bold text-white text-center mb-6">Rolni tanlang</h2>

            <button
              onClick={() => handleRoleSelect(UserRole.CUSTOMER)}
              className="w-full p-5 border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl flex items-center space-x-4 transition-all group"
            >
              <div className="w-14 h-14 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <UserIcon size={28} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-xl text-white">Mijoz (Ish beruvchi)</h3>
                <p className="text-sm text-blue-100">Ishchi yollash va xizmatlardan foydalanish</p>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect(UserRole.WORKER)}
              className="w-full p-5 border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-2xl flex items-center space-x-4 transition-all group"
            >
              <div className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Briefcase size={28} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-xl text-white">Ishchi (Mardikor)</h3>
                <p className="text-sm text-green-100">Buyurtmalar olish va daromad qilish</p>
              </div>
            </button>
            <button
              onClick={() => handleRoleSelect(UserRole.ADMIN)}
              className="w-full p-5 border border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 rounded-2xl flex items-center space-x-4 transition-all group opacity-70 hover:opacity-100"
            >
              <div className="w-14 h-14 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <TrendingUp size={28} />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-xl text-white">Admin</h3>
                <p className="text-sm text-purple-100">Platforma boshqaruvi</p>
              </div>
            </button>
          </div>
        )}

        {/* WORKER SETUP */}
        {view === 'WORKER_SETUP' && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl shadow-blue-900/20 dark:shadow-black/50 border border-gray-100 dark:border-gray-800 animate-fadeIn">
            {setupStep === 1 ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Profilni Tasdiqlash</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tasdiqdan o'tish uchun hujjatlarni yuklang</p>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center space-y-2 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800/50">
                  <Camera size={32} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Selfi olish</span>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center space-y-2 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-colors bg-gray-50 dark:bg-gray-800/50">
                  <FileText size={32} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Pasport nusxasi</span>
                </div>

                <button
                  onClick={() => setSetupStep(2)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl mt-4"
                >
                  Davom etish
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ko'nikmalaringiz</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Qo'lingizdan keladigan ishlarni belgilang</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {['Santexnika', 'Elektr', 'Tozalash', 'Yuk tashish', 'Qurilish', 'Bo\'yoqchi', 'Bog\'bon', 'Haydovchi'].map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={`p-3 rounded-lg text-sm font-medium border transition-all ${workerSkills.includes(skill)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      {skill}
                      {workerSkills.includes(skill) && <CheckCircle size={12} className="inline ml-1 mb-0.5" />}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleWorkerSetupComplete}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl mt-4 flex items-center justify-center shadow-lg shadow-green-600/30"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : 'Ro\'yxatdan o\'tish'}
                </button>
              </div>
            )}
          </div>
        )}

      </div>

      <p className="absolute bottom-4 text-blue-200 dark:text-gray-600 text-xs">© 2024 Mardikor Inc.</p>
    </div>
  );
};
