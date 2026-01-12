import React, { useState, useMemo } from 'react';
import { Chat, User } from '../../types';
import { MessageCircle, Search, X, Wallet, TrendingUp } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  users: User[];
  currentUserId: string;
  selectedChatId?: string;
  onSelectChat: (chatId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  users,
  currentUserId,
  selectedChatId,
  onSelectChat
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getOtherUser = (chat: Chat): User | undefined => {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    return users.find(u => u.id === otherUserId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (diff < 60000) return 'Hozir';
    if (diff < 86400000) {
      return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    }
    if (daysDiff === 1) return 'Kecha';
    if (daysDiff < 7) {
      return date.toLocaleDateString('uz-UZ', { weekday: 'short' });
    }
    return date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
  };

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;

    return chats.filter(chat => {
      const otherUser = getOtherUser(chat);
      if (!otherUser) return false;

      const fullName = `${otherUser.name} ${otherUser.surname}`.toLowerCase();
      const lastMessage = chat.lastMessage?.content?.toLowerCase() || '';

      return fullName.includes(searchQuery.toLowerCase()) ||
        lastMessage.includes(searchQuery.toLowerCase());
    });
  }, [chats, searchQuery, users, currentUserId]);

  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-4 py-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">Xabarlar</h1>
            <p className="text-blue-200 text-xs mt-0.5">Barcha suhbatlaringiz</p>
          </div>
          {totalUnread > 0 && (
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="text-sm font-bold">{totalUnread} yangi</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle size={14} className="text-blue-200" />
              <span className="text-blue-200 text-xs">Jami suhbat</span>
            </div>
            <p className="text-xl font-bold">{chats.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-300" />
              <span className="text-blue-200 text-xs">Faol</span>
            </div>
            <p className="text-xl font-bold">{chats.filter(c => c.unreadCount > 0).length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" />
          <input
            type="text"
            placeholder="Qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-sm text-white placeholder:text-blue-200 focus:bg-white/20 focus:border-white/40 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-blue-500" />
            </div>
            {searchQuery ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">"{searchQuery}" topilmadi</p>
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-300 font-medium">Suhbatlar yo'q</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Buyurtma yoki ish qabul qilib boshlang
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredChats.map((chat) => {
              const otherUser = getOtherUser(chat);
              if (!otherUser) return null;

              const hasUnread = (chat.unreadCount || 0) > 0;
              const isOnline = (otherUser as any).isOnline;

              return (
                <div
                  key={chat.id}
                  className="flex gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800"
                  onClick={() => onSelectChat(chat.id)}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={otherUser.avatar || 'https://ui-avatars.com/api/?name=' + otherUser.name + '&background=6366f1&color=fff'}
                      alt={otherUser.name}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
                    />
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900">
                        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50"></span>
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-semibold truncate text-sm ${hasUnread ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                          {otherUser.name} {otherUser.surname}
                        </span>
                        <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${otherUser.role === 'WORKER'
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300'
                          }`}>
                          {otherUser.role === 'WORKER' ? 'Ishchi' : 'Mijoz'}
                        </span>
                      </div>
                      {chat.lastMessage && (
                        <span className={`flex-shrink-0 text-[11px] ${hasUnread ? 'text-blue-500 font-medium' : 'text-gray-400 dark:text-gray-500'
                          }`}>
                          {formatTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${hasUnread
                          ? 'font-medium text-gray-800 dark:text-gray-200'
                          : 'text-gray-500 dark:text-gray-400'
                        }`}>
                        {chat.lastMessage?.content || 'Xabar yo\'q'}
                      </span>
                      {hasUnread && (
                        <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full text-[11px] font-bold flex items-center justify-center shadow-sm">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
