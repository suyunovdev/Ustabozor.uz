import React, { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: any[]) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="flex items-center gap-3 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800" onSubmit={handleSubmit}>
      <button
        type="button"
        className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Fayl biriktirish"
        disabled={disabled}
      >
        <Paperclip size={20} />
      </button>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Xabar yozing..."
        disabled={disabled}
        className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-700 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed"
      />

      <button
        type="button"
        className="flex items-center justify-center w-10 h-10 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Emoji"
        disabled={disabled}
      >
        <Smile size={20} />
      </button>

      <button
        type="submit"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        disabled={disabled || !message.trim()}
        title="Yuborish"
      >
        <Send size={18} className="ml-0.5" />
      </button>
    </form>
  );
};
