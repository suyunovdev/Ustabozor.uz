import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Message, User } from '../../types';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ArrowLeft, MoreVertical, Phone, Video, ChevronDown } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  otherUser?: User;
  onSendMessage: (content: string, attachments?: any[]) => void;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  currentUserId,
  otherUser,
  onSendMessage,
  onBack
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const prevMessagesLength = useRef(messages.length);
  const initialLoad = useRef(true);

  // Scroll pozitsiyasini tekshirish
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const nearBottom = distanceFromBottom < 100;
    setIsNearBottom(nearBottom);
    setShowScrollButton(distanceFromBottom > 300);
  }, []);

  // Pastga scroll qilish
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Xabarlar o'zgarganda scroll qilish
  useEffect(() => {
    // Birinchi yuklashda pastga scroll
    if (initialLoad.current && messages.length > 0) {
      scrollToBottom('instant');
      initialLoad.current = false;
      prevMessagesLength.current = messages.length;
      return;
    }

    // Yangi xabar kelganda
    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.senderId === currentUserId;

      // O'z xabarimiz bo'lsa yoki pastda bo'lsak - scroll
      if (isOwnMessage || isNearBottom) {
        scrollToBottom('smooth');
      } else {
        // Yangi xabar keldi lekin foydalanuvchi tepada - scroll button ko'rsatish
        setShowScrollButton(true);
      }
    }

    prevMessagesLength.current = messages.length;
  }, [messages, currentUserId, isNearBottom, scrollToBottom]);

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 text-center text-gray-500 dark:text-gray-400">
        <div className="max-w-xs p-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Suhbatni tanlang</h3>
          <p className="text-sm">Xabar yuborish uchun chap tarafdan suhbatni tanlang</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Enhanced Chat Header with Profile Info */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm z-10">
        {/* Top Row - Navigation & Basic Info */}
        <div className="flex items-center gap-4 p-4">
          {onBack && (
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              onClick={onBack}
            >
              <ArrowLeft size={20} />
            </button>
          )}

          <img
            src={otherUser.avatar || 'https://ui-avatars.com/api/?name=' + otherUser.name}
            alt={otherUser.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-100 dark:ring-blue-900"
          />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{otherUser.name} {otherUser.surname}</h3>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${otherUser.role === 'WORKER'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                {otherUser.role === 'WORKER' ? '🔧 Ishchi' : '👤 Mijoz'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-500 font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Onlayn
              </span>
              {otherUser.role === 'WORKER' && (otherUser as any).rating && (
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 font-medium">
                  ⭐ {(otherUser as any).rating} ({(otherUser as any).ratingCount || 0} baho)
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <button className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors" title="Qo'ng'iroq">
              <Phone size={20} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors" title="Video qo'ng'iroq">
              <Video size={20} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors" title="Boshqa">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Bottom Row - Professional Info (Worker Only) */}
        {otherUser.role === 'WORKER' && (otherUser as any).skills && (
          <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-800 pt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Mutaxassislik:</span>
              {(otherUser as any).skills.slice(0, 3).map((skill: string, idx: number) => (
                <span key={idx} className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
                  {skill}
                </span>
              ))}
              {(otherUser as any).isOnline && (
                <span className="text-xs px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full font-medium ml-auto">
                  ✓ Ish qabul qilmoqda
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Messages container with scroll handling */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 relative"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 text-center">
            <p className="text-sm">Hozircha xabarlar yo'q. Birinchi bo'lib xabar yuboring!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isFirst = index === 0;
            const prevMessage = !isFirst ? messages[index - 1] : null;
            const showDate = !prevMessage ||
              new Date(message.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();

            return (
              <React.Fragment key={message.id}>
                {showDate && (
                  <div className="flex justify-center my-6 relative z-0">
                    <span className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full font-medium">
                      {new Date(message.timestamp).toLocaleDateString('uz-UZ', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === currentUserId}
                  senderName={message.senderId !== currentUserId ? `${otherUser.name}` : undefined}
                  senderAvatar={message.senderId !== currentUserId ? otherUser.avatar : undefined}
                  senderRole={message.senderId !== currentUserId ? otherUser.role : undefined}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />

        {/* Scroll to bottom button - Telegram style */}
        {showScrollButton && (
          <div className="sticky bottom-4 flex justify-center pointer-events-none">
            <button
              onClick={() => scrollToBottom('smooth')}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105"
              title="Pastga tushish"
            >
              <ChevronDown size={18} className="text-blue-500" />
              <span className="text-sm font-medium">Yangi xabarlar</span>
            </button>
          </div>
        )}
      </div>

      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
};
