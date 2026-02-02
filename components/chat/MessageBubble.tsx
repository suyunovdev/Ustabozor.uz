import React, { useState } from 'react';
import { Message, MessageStatus } from '../../types';
import { Check, CheckCheck, Copy, MoreHorizontal, Reply, Trash2, MapPin } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  senderRole?: string;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  senderName,
  senderAvatar,
  senderRole,
  onReply,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case MessageStatus.SENT:
        return <Check size={12} className="text-gray-400" />;
      case MessageStatus.DELIVERED:
        return <CheckCheck size={12} className="text-gray-400" />;
      case MessageStatus.READ:
        return <CheckCheck size={12} className="text-blue-500" />;
      default:
        return <Check size={12} className="text-gray-400" />;
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  const handleReply = () => {
    if (onReply) onReply(message);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(message.id);
    setShowMenu(false);
  };

  const handleReaction = (emoji: string) => {
    setReaction(emoji === reaction ? null : emoji);
    setShowReactions(false);
  };

  return (
    <div
      className={`flex gap-2 mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseLeave={() => { setShowMenu(false); setShowReactions(false); }}
    >
      {/* Avatar */}
      {!isOwn && senderAvatar && (
        <img
          src={senderAvatar}
          alt={senderName}
          className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-auto"
        />
      )}

      <div className={`max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isOwn && senderName && (
          <div className="flex items-center gap-1.5 mb-0.5 ml-1">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{senderName}</span>
            {senderRole && (
              <span className={`text-[8px] px-1 py-0.5 rounded font-bold uppercase ${senderRole === 'WORKER'
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300'
                }`}>
                {senderRole === 'WORKER' ? 'Ishchi' : 'Mijoz'}
              </span>
            )}
          </div>
        )}

        {/* Message container */}
        <div className="relative group">
          {/* Reaction button */}
          <button
            onClick={() => setShowReactions(!showReactions)}
            className={`absolute ${isOwn ? '-left-6' : '-right-6'} top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white dark:bg-gray-800 shadow border border-gray-100 dark:border-gray-700 text-[10px] opacity-0 group-hover:opacity-100 transition-all hover:scale-110 flex items-center justify-center`}
          >
            {reaction || '😊'}
          </button>

          {/* Reactions picker */}
          {showReactions && (
            <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-10 z-20 flex gap-0.5 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-100 dark:border-gray-700`}>
              {REACTIONS.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => handleReaction(emoji)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110 ${reaction === emoji ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`relative py-2 px-3 rounded-2xl text-sm leading-relaxed break-words ${isOwn
              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-md shadow-sm'
              }`}
            onClick={() => setShowMenu(!showMenu)}
          >
            {(() => {
              // 1. Check for Google Maps location
              const locationMatch = message.content.match(/📍 Mening joylashuvim: (https:\/\/www\.google\.com\/maps\?q=[-0-9.]+,[-0-9.]+)/);
              if (locationMatch) {
                const url = locationMatch[1];
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <MapPin size={16} className={isOwn ? 'text-white' : 'text-red-500'} />
                      <span>Mening joylashuvim</span>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${isOwn
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
                        }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MapPin size={14} />
                      Xaritada ko'rish
                    </a>
                  </div>
                );
              }

              // 2. Check for Reply
              const replyMatch = message.content.match(/^> (.*?)\n\n(.*)/s);
              if (replyMatch) {
                const [, quotedText, actualText] = replyMatch;
                return (
                  <>
                    <div className={`mb-2 px-2 py-1 rounded border-l-2 text-xs opacity-90 ${isOwn
                      ? 'bg-white/10 border-white/50'
                      : 'bg-gray-100 dark:bg-gray-700/50 border-blue-500 text-gray-600 dark:text-gray-300'
                      }`}>
                      <p className="font-medium opacity-75 text-[10px] mb-0.5">Javob:</p>
                      <p className="line-clamp-2 italic">{quotedText}</p>
                    </div>
                    <p className="whitespace-pre-wrap">{actualText}</p>
                  </>
                );
              }

              // 3. Default text
              return <p className="whitespace-pre-wrap">{message.content}</p>;
            })()}

            {/* Reaction badge */}
            {reaction && (
              <div
                className={`absolute -bottom-2.5 ${isOwn ? 'right-1' : 'left-1'} bg-white dark:bg-gray-800 rounded-full px-1 py-0.5 shadow border border-gray-100 dark:border-gray-700 text-xs cursor-pointer hover:scale-110 transition-transform`}
                onClick={(e) => { e.stopPropagation(); setReaction(null); }}
              >
                {reaction}
              </div>
            )}
          </div>

          {/* Context menu */}
          {showMenu && (
            <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-w-[120px]`}>
              <button
                onClick={copyMessage}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Copy size={12} />
                Nusxalash
              </button>
              <button
                onClick={handleReply}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Reply size={12} />
                Javob
              </button>
              {isOwn && (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={12} />
                  O'chirish
                </button>
              )}
            </div>
          )}
        </div>


        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className={`flex flex-col gap-2 mt-2 ${isOwn ? 'items-end' : 'items-start'}`}>
            {message.attachments.map((att, idx) => {
              const isImage = att.type?.startsWith('image/');

              if (isImage) {
                return (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative max-w-[240px] rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={att.url}
                      alt={att.name}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                        <MapPin size={16} className="text-gray-700 dark:text-gray-300" />
                      </div>
                    </div>
                  </a>
                );
              }

              return (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 transition-all hover:scale-105 ${isOwn
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>📎</span>
                  <span className="truncate max-w-[140px] font-medium">{att.name}</span>
                </a>
              );
            })}
          </div>
        )}

        {/* Time and status */}
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${reaction ? 'mt-3' : ''} ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {formatTime(message.timestamp)}
          </span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};
