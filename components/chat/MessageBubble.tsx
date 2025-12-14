import React from 'react';
import { Message, MessageStatus } from '../../types';
import { Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
  senderRole?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  senderName,
  senderAvatar,
  senderRole
}) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case MessageStatus.SENT:
        return <Check size={16} />;
      case MessageStatus.DELIVERED:
        return <CheckCheck size={16} />;
      case MessageStatus.READ:
        return <CheckCheck size={16} className="read" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-2 mb-4 max-w-[80%] ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
      {!isOwn && senderAvatar && (
        <img src={senderAvatar} alt={senderName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      )}

      <div className={`flex flex-col gap-1 max-w-full ${isOwn ? 'items-end' : 'items-start'}`}>
        {!isOwn && senderName && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{senderName}</span>
            {senderRole && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${senderRole === 'WORKER'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}>
                {senderRole === 'WORKER' ? 'Ishchi' : 'Mijoz'}
              </span>
            )}
          </div>
        )}

        <div className={`py-3 px-4 rounded-2xl text-sm leading-relaxed break-words shadow-sm ${isOwn
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none'
          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 rounded-bl-none'
          }`}>
          {message.content}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {message.attachments.map((att, idx) => (
              <div key={idx} className="px-3 py-2 bg-white/20 rounded-lg text-sm flex items-center gap-2">
                <span>📎</span> {att.name}
              </div>
            ))}
          </div>
        )}

        <div className={`flex items-center gap-1 text-[10px] px-1 ${isOwn ? 'text-gray-400 dark:text-gray-500 justify-end' : 'text-gray-400 dark:text-gray-500'
          }`}>
          <span className="opacity-80">{formatTime(message.timestamp)}</span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
};
