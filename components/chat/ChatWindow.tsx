import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Message, User } from '../../types';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  ChevronDown,
  Star,
  Shield,
  MessageCircle,
  Send
} from 'lucide-react';

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
  const [isTyping, setIsTyping] = useState(false);
  const prevMessagesLength = useRef(messages.length);
  const initialLoad = useRef(true);

  // Typing indicator simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.97 && otherUser) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 2000 + Math.random() * 1500);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [otherUser]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsNearBottom(distanceFromBottom < 100);
    setShowScrollButton(distanceFromBottom > 200);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    if (initialLoad.current && messages.length > 0) {
      scrollToBottom('instant');
      initialLoad.current = false;
      prevMessagesLength.current = messages.length;
      return;
    }

    if (messages.length > prevMessagesLength.current) {
      const lastMessage = messages[messages.length - 1];
      const isOwnMessage = lastMessage?.senderId === currentUserId;

      if (isOwnMessage || isNearBottom) {
        scrollToBottom('smooth');
      } else {
        setShowScrollButton(true);
      }
    }

    prevMessagesLength.current = messages.length;
  }, [messages, currentUserId, isNearBottom, scrollToBottom]);

  if (!otherUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950 p-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl mb-6">
          <MessageCircle size={36} className="text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Suhbatni tanlang</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
          Xabar yuborish uchun suhbatni tanlang
        </p>
      </div>
    );
  }

  const isOnline = (otherUser as any).isOnline;
  const rating = (otherUser as any).rating;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="flex items-center gap-3 px-3 py-3">
          {/* Back button */}
          {onBack && (
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
              onClick={onBack}
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <img
              src={otherUser.avatar || 'https://ui-avatars.com/api/?name=' + otherUser.name + '&background=6366f1&color=fff'}
              alt={otherUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
            />
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-600"></span>
            )}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold truncate">{otherUser.name} {otherUser.surname}</h3>
              <span className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${otherUser.role === 'WORKER'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-400/30 text-emerald-100'
                }`}>
                {otherUser.role === 'WORKER' ? 'Ishchi' : 'Mijoz'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-200">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  Onlayn
                </span>
              ) : (
                <span>Oflayn</span>
              )}
              {otherUser.role === 'WORKER' && rating && (
                <>
                  <span className="text-blue-300">•</span>
                  <span className="flex items-center gap-0.5">
                    <Star size={10} className="fill-yellow-400 text-yellow-400" />
                    {rating}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <Phone size={16} />
            </button>
            <button className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 bg-gray-50 dark:bg-gray-950"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Send size={20} className="text-blue-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Xabar yo'q</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Birinchi bo'lib yozing! 👋</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((message, index) => {
              const isFirst = index === 0;
              const prevMessage = !isFirst ? messages[index - 1] : null;
              const showDate = !prevMessage ||
                new Date(message.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();

              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 font-medium">
                        {new Date(message.timestamp).toLocaleDateString('uz-UZ', {
                          day: 'numeric',
                          month: 'long'
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
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 py-1">
                <img
                  src={otherUser.avatar || 'https://ui-avatars.com/api/?name=' + otherUser.name}
                  alt={otherUser.name}
                  className="w-6 h-6 rounded-full"
                />
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />

        {/* Scroll button */}
        {showScrollButton && (
          <div className="sticky bottom-2 flex justify-center">
            <button
              onClick={() => scrollToBottom('smooth')}
              className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-medium active:scale-95 transition-transform"
            >
              <ChevronDown size={14} className="text-blue-500" />
              Pastga
            </button>
          </div>
        )}
      </div>

      <ChatInput onSendMessage={onSendMessage} />
    </div>
  );
};
