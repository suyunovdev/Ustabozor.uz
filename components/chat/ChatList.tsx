import React from 'react';
import { Chat, User } from '../../types';
import { MessageCircle } from 'lucide-react';

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
  const getOtherUser = (chat: Chat): User | undefined => {
    const otherUserId = chat.participants.find(id => id !== currentUserId);
    return users.find(u => u.id === otherUserId);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 86400000) { // Less than 24 hours
      return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <MessageCircle size={24} /> Xabarlar
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-center">
            <MessageCircle size={48} className="mb-4 opacity-50" />
            <p>Hozircha xabarlar yo'q</p>
          </div>
        ) : (
          chats.map(chat => {
            const otherUser = getOtherUser(chat);
            if (!otherUser) return null;

            return (
              <div
                key={chat.id}
                className={`flex gap-4 p-4 cursor-pointer border-b border-gray-50 dark:border-gray-800/50 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedChatId === chat.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500 dark:border-l-blue-400'
                  : 'border-l-4 border-l-transparent'
                  }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <img
                  src={otherUser.avatar || 'https://ui-avatars.com/api/?name=' + otherUser.name}
                  alt={otherUser.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">
                        {otherUser.name} {otherUser.surname}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${otherUser.role === 'WORKER'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}>
                        {otherUser.role === 'WORKER' ? 'Ishchi' : 'Mijoz'}
                      </span>
                    </div>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {formatTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className={`text-sm truncate ${chat.unreadCount > 0
                      ? 'font-bold text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                      }`}>
                      {chat.lastMessage?.content || 'Xabar yo\'q'}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
