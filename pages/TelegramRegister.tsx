
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { ApiService } from '../services/api';
import {
  Zap, Loader2, User as UserIcon, Briefcase, CheckCircle, Mail, Lock, Eye, EyeOff
} from '../components/Icons';

interface TelegramRegisterProps {
  initData: string;
  tgUser: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };
  onRegister: (user: User) => void;
  onLogin: (user: User) => void;
}

type TgRegView = 'ROLE_SELECT' | 'FORM' | 'LINK_ACCOUNT';

export const TelegramRegister: React.FC<TelegramRegisterProps> = ({ initData, tgUser, onRegister, onLogin }) => {
  const [view, setView] = useState<TgRegView>('ROLE_SELECT');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Register form
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');

  // Link account form
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setView('FORM');
  };

  const handleRegister = async () => {
    if (!selectedRole) return;

    if (!phone.trim()) {
      setError('Telefon raqamini kiriting');
      return;
    }

    if (selectedRole === UserRole.WORKER && skills.length === 0) {
      setError('Kamida bitta ko\'nikma tanlang');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await ApiService.telegramRegister(
        initData,
        selectedRole,
        phone.startsWith('+998') ? phone : `+998${phone}`,
        selectedRole === UserRole.WORKER ? skills : undefined,
        selectedRole === UserRole.WORKER && hourlyRate ? Number(hourlyRate) : undefined
      );

      if (result.user) {
        onRegister(result.user);
      } else {
        setError(result.message || 'Ro\'yxatdan o\'tishda xatolik');
      }
    } catch (err: any) {
      setError(err.message || 'Server xatosi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkEmail || !linkPassword) {
      setError('Email va parolni kiriting');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await ApiService.telegramLink(initData, linkEmail, linkPassword);
      if (result.user) {
        onLogin(result.user);
      } else {
        setError(result.message || 'Ulashda xatolik');
      }
    } catch (err: any) {
      setError(err.message || 'Server xatosi');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter(s => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-6 overflow-hidden relative transition-colors duration-300">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-br from-blue-600 to-indigo-900 dark:from-blue-900 dark:to-gray-950 rounded-b-[4rem] shadow-2xl z-0"></div>

      {/* Header */}
      <div className="z-10 text-center mt-0 mb-6">
        <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-2xl ring-4 ring-white/20">
          <Zap size={40} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">IshTop</h1>
        <p className="text-blue-100 text-sm">
          Salom, <span className="font-semibold">{tgUser.first_name}</span>! Ro'yxatdan o'ting.
        </p>
      </div>

      {/* Content */}
      <div className="z-20 w-full max-w-md">

        {/* ROLE SELECT */}
        {view === 'ROLE_SELECT' && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-xl font-bold text-white text-center mb-4">Rolni tanlang</h2>

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
                <h3 className="font-bold text-xl text-white">Ishchi (Usta)</h3>
                <p className="text-sm text-green-100">Buyurtmalar olish va daromad qilish</p>
              </div>
            </button>

            <button
              onClick={() => { setView('LINK_ACCOUNT'); setError(''); }}
              className="w-full text-center text-blue-200 text-sm mt-4 hover:underline"
            >
              Mavjud akkauntim bor — ulash
            </button>
          </div>
        )}

        {/* REGISTER FORM */}
        {view === 'FORM' && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-fadeIn">
            <button
              onClick={() => { setView('ROLE_SELECT'); setError(''); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm mb-4 flex items-center"
            >
              &larr; Ortga
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">
              {selectedRole === UserRole.WORKER ? 'Ishchi profili' : 'Mijoz profili'}
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-5">
              Ma'lumotlaringizni to'ldiring
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg text-center font-medium border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            {/* Name from Telegram (read-only) */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-400">Ism (Telegram'dan)</span>
              <p className="text-gray-900 dark:text-white font-medium">
                {tgUser.first_name} {tgUser.last_name || ''}
              </p>
            </div>

            {/* Phone */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 font-bold text-sm">+998</span>
              </div>
              <input
                type="tel"
                className="block w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all sm:text-sm"
                placeholder="90 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Worker-specific fields */}
            {selectedRole === UserRole.WORKER && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ko'nikmalar
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Santexnika', 'Elektr', 'Tozalash', 'Yuk tashish', 'Qurilish', 'Bo\'yoqchi', 'Bog\'bon', 'Haydovchi'].map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`p-2.5 rounded-lg text-sm font-medium border transition-all ${skills.includes(skill)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {skill}
                        {skills.includes(skill) && <CheckCircle size={12} className="inline ml-1 mb-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative mb-4">
                  <input
                    type="number"
                    className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all sm:text-sm"
                    placeholder="Soatlik narx (so'm)"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              onClick={handleRegister}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : 'Ro\'yxatdan o\'tish'}
            </button>
          </div>
        )}

        {/* LINK EXISTING ACCOUNT */}
        {view === 'LINK_ACCOUNT' && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-100 dark:border-gray-800 animate-fadeIn">
            <button
              onClick={() => { setView('ROLE_SELECT'); setError(''); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-sm mb-4 flex items-center"
            >
              &larr; Ortga
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">
              Akkauntni ulash
            </h2>
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-5">
              Mavjud email va parolingiz bilan kiring
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg text-center font-medium border border-red-100 dark:border-red-900/30">
                {error}
              </div>
            )}

            <form onSubmit={handleLinkAccount}>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all sm:text-sm"
                  placeholder="Elektron pochta"
                  value={linkEmail}
                  onChange={(e) => setLinkEmail(e.target.value)}
                  required
                />
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="block w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all sm:text-sm"
                  placeholder="Parol"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  required
                />
                <div
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Telegram\'ga ulash'}
              </button>
            </form>
          </div>
        )}

      </div>

      <p className="absolute bottom-4 text-blue-200 dark:text-gray-600 text-xs z-10">© 2024 IshTop Inc.</p>
    </div>
  );
};
