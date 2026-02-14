import React from "react";
import {
  ShieldOff,
  Clock,
  AlertTriangle,
  LogOut,
  Send,
  ExternalLink,
} from "lucide-react";

interface BannedScreenProps {
  reason?: string;
  blockedUntil?: string | null;
  blockedAt?: string;
  onLogout: () => void;
}

const formatDuration = (blockedUntil: string | null | undefined): string => {
  if (!blockedUntil) return "Doimiy";
  const until = new Date(blockedUntil);
  const now = new Date();
  const diffMs = until.getTime() - now.getTime();

  if (diffMs <= 0) return "Muddat tugagan";

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} kun ${hours % 24} soat qoldi`;
  if (hours > 0) return `${hours} soat qoldi`;
  const minutes = Math.floor(diffMs / (1000 * 60));
  return `${minutes} daqiqa qoldi`;
};

export const BannedScreen: React.FC<BannedScreenProps> = ({
  reason,
  blockedUntil,
  blockedAt,
  onLogout,
}) => {
  const isExpired =
    blockedUntil && new Date(blockedUntil).getTime() < Date.now();

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <ShieldOff size={48} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">
            Hisobingiz bloklangan
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
            Platformadan foydalanish vaqtincha cheklangan
          </p>
        </div>

        {/* Ban Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-red-200 dark:border-red-900/50 overflow-hidden">
          {/* Reason */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Sabab
                </p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {reason || "Sabab ko'rsatilmagan"}
                </p>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex-shrink-0">
                <Clock size={20} className="text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Muddat
                </p>
                <p className="text-gray-900 dark:text-white font-medium">
                  {formatDuration(blockedUntil)}
                </p>
                {blockedUntil && (
                  <p className="text-xs text-gray-400 mt-1">
                    Gacha: {new Date(blockedUntil).toLocaleString("uz-UZ")}
                  </p>
                )}
                {!blockedUntil && (
                  <p className="text-xs text-red-400 mt-1 font-medium">
                    Muddatsiz bloklangan
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Blocked At */}
          {blockedAt && (
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-xs text-gray-400">
                Bloklangan sana: {new Date(blockedAt).toLocaleString("uz-UZ")}
              </p>
            </div>
          )}
        </div>

        {/* Contact Admin via Telegram */}
        <a
          href="https://t.me/Suyunov_dev1"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 block bg-gradient-to-r from-[#2AABEE] to-[#229ED9] rounded-2xl p-4 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Send size={22} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">Adminga murojat qilish</p>
              <p className="text-blue-100 text-xs mt-0.5">
                Telegram orqali tezkor aloqa
              </p>
            </div>
            <ExternalLink size={18} className="text-white/60 flex-shrink-0" />
          </div>
        </a>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="w-full mt-6 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
        >
          <LogOut size={18} />
          Chiqish
        </button>

        {isExpired && (
          <p className="text-center text-green-600 dark:text-green-400 text-sm font-medium mt-4">
            Bloklash muddati tugagan. Sahifani yangilang yoki qayta kiring.
          </p>
        )}
      </div>
    </div>
  );
};
