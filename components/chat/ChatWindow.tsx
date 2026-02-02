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
  Send,
  Trash2,
  Ban,
  Flag,
  UserX,
  Info
} from 'lucide-react';

interface ChatWindowProps {
  chatId: string;
  messages: Message[];
  currentUserId: string;
  otherUser?: User;
  onSendMessage: (content: string, attachments?: any[]) => void;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
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

  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showMenu, setShowMenu] = useState(false);

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
      const senderId = typeof lastMessage?.senderId === 'object'
        ? (lastMessage.senderId as any)._id || (lastMessage.senderId as any).id
        : lastMessage?.senderId;
      const isOwnMessage = senderId === currentUserId;

      if (isOwnMessage || isNearBottom) {
        scrollToBottom('smooth');
      } else {
        setShowScrollButton(true);
      }
    }

    prevMessagesLength.current = messages.length;
  }, [messages, currentUserId, isNearBottom, scrollToBottom]);

  const handleReply = useCallback((message: Message) => {
    setReplyingToMessage(message);
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    if (window.confirm("Xabarni o'chirishni xohlaysizmi?")) {
      try {
        const { ChatService } = await import('../../services/chatService');
        await ChatService.deleteMessage(messageId);
        // Note: The parent component should handle refreshing messages, 
        // but since we don't have a callback for that here, we rely on the polling 
        // in ChatPage to pick up the deletion.
        // Ideally, we should have an onDeleteMessage callback prop.
      } catch (error) {
        console.error("Failed to delete message", error);
      }
    }
  }, []);

  const handlePhoneCall = useCallback(() => {
    if (otherUser?.phone) {
      window.location.href = `tel:${otherUser.phone}`;
    } else {
      alert("Telefon raqami mavjud emas");
    }
  }, [otherUser]);

  const handleClearChat = useCallback(async () => {
    if (window.confirm("Barcha xabarlarni o'chirmoqchimisiz?")) {
      try {
        const { ChatService } = await import('../../services/chatService');
        const success = await ChatService.clearChat(chatId);
        if (success) {
          // Toast notification would be good here
          alert("Suhbat tozalandi");
          // Ideally trigger a refresh of messages
        } else {
          alert("Xatolik yuz berdi");
        }
      } catch (error) {
        console.error("Failed to clear chat", error);
      }
    }
    setShowMenu(false);
  }, [chatId]);

  const handleBlockUser = useCallback(async () => {
    if (!otherUser) return;
    if (window.confirm(`${otherUser.name}ni bloklashni xohlaysizmi?`)) {
      try {
        const { ChatService } = await import('../../services/chatService');
        const success = await ChatService.blockUser(currentUserId, otherUser.id);
        if (success) {
          alert("Foydalanuvchi bloklandi");
        } else {
          alert("Xatolik yuz berdi");
        }
      } catch (error) {
        console.error("Failed to block user", error);
      }
    }
    setShowMenu(false);
  }, [otherUser, currentUserId]);

  const handleReportUser = useCallback(async () => {
    if (!otherUser) return;
    const reason = prompt("Shikoyat sababini yozing:");
    if (reason) {
      try {
        const { ChatService } = await import('../../services/chatService');
        const success = await ChatService.reportUser(currentUserId, otherUser.id, reason);
        if (success) {
          alert("Shikoyat yuborildi");
        } else {
          alert("Xatolik yuz berdi");
        }
      } catch (error) {
        console.error("Failed to report user", error);
      }
    }
    setShowMenu(false);
  }, [otherUser, currentUserId]);

  const handleSendMessage = (content: string, attachments?: any[]) => {
    let finalContent = content;
    if (replyingToMessage) {
      const replyQuote = `> ${replyingToMessage.content}\n\n`;
      finalContent = replyQuote + content;
      setReplyingToMessage(null);
    }
    onSendMessage(finalContent, attachments);
  };

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
      {/* Header - Enhanced */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3.5">
          {/* Back button */}
          {onBack && (
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all active:scale-95 shadow-sm"
              onClick={onBack}
              aria-label="Orqaga"
            >
              <ArrowLeft size={20} />
            </button>
          )}

          {/* Avatar with online indicator */}
          <div className="relative flex-shrink-0">
            <div className="relative">
              <img
                src={otherUser.avatar || 'https://ui-avatars.com/api/?name=' + otherUser.name + '&background=6366f1&color=fff'}
                alt={otherUser.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white/40 shadow-md"
              />
              {isOnline && (
                <>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-blue-600"></span>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full animate-ping"></span>
                </>
              )}
            </div>
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-base truncate">{otherUser.name} {otherUser.surname}</h3>
              <span className={`flex-shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shadow-sm ${otherUser.role === 'WORKER'
                ? 'bg-white/20 text-white backdrop-blur-sm'
                : 'bg-emerald-400/30 text-emerald-100 backdrop-blur-sm'
                }`}>
                {otherUser.role === 'WORKER' ? 'ISHCHI' : 'MIJOZ'}
              </span>
              {otherUser.role === 'WORKER' && rating && rating >= 4.5 && (
                <Shield size={14} className="text-yellow-300 fill-yellow-300" title="Tasdiqlangan ishchi" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-green-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-300"></span>
                  </span>
                  Onlayn
                </span>
              ) : (
                <span className="text-blue-200">Oflayn</span>
              )}
              {otherUser.role === 'WORKER' && rating && (
                <>
                  <span className="text-blue-300">•</span>
                  <span className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                    <Star size={11} className="fill-yellow-300 text-yellow-300" />
                    <span className="font-semibold text-yellow-100">{rating.toFixed(1)}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {/* Actions */}
          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={handlePhoneCall}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 shadow-sm group"
              aria-label="Qo'ng'iroq qilish"
              title="Qo'ng'iroq qilish"
            >
              <Phone size={18} className="group-hover:scale-110 transition-transform" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 shadow-sm group ${showMenu ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                aria-label="Boshqa"
              >
                <MoreVertical size={18} className="group-hover:scale-110 transition-transform" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setShowMenu(false)}
                  ></div>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20 animate-slideUp origin-top-right">
                    <div className="p-1">
                      <button
                        onClick={handleClearChat}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-gray-400" />
                        Suhbatni tozalash
                      </button>
                      <button
                        onClick={handleBlockUser}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Ban size={16} className="text-gray-400" />
                        Bloklash
                      </button>
                      <button
                        onClick={handleReportUser}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Flag size={16} />
                        Shikoyat qilish
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
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

              // Handle populated senderId safely
              const senderId = typeof message.senderId === 'object'
                ? (message.senderId as any)._id || (message.senderId as any).id
                : message.senderId;

              const isOwn = senderId === currentUserId;

              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] px-3 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 font-medium">
                        {(() => {
                          const date = new Date(message.timestamp);
                          const today = new Date();
                          const yesterday = new Date(today);
                          yesterday.setDate(yesterday.getDate() - 1);

                          if (date.toDateString() === today.toDateString()) {
                            return 'Bugun';
                          } else if (date.toDateString() === yesterday.toDateString()) {
                            return 'Kecha';
                          } else {
                            const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                              'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
                            return `${date.getDate()} ${months[date.getMonth()]}`;
                          }
                        })()}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    senderName={!isOwn ? `${otherUser.name}` : undefined}
                    senderAvatar={!isOwn ? otherUser.avatar : undefined}
                    senderRole={!isOwn ? otherUser.role : undefined}
                    onReply={handleReply}
                    onDelete={handleDelete}
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

      <ChatInput
        onSendMessage={handleSendMessage}
        replyingTo={replyingToMessage}
        onCancelReply={() => setReplyingToMessage(null)}
      />
    </div>
  );
};
