import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, Mic, X, Image, MapPin } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: any[]) => void;
  disabled?: boolean;
}

const QUICK_EMOJIS = ['😊', '👍', '❤️', '😂', '🔥', '👏', '🙏', '✅', '👋', '🎉', '💪', '🤝'];

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setShowEmoji(false);
      setShowAttach(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    recordingInterval.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    onSendMessage('🎤 Ovozli xabar');
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
      {/* Emoji picker */}
      {showEmoji && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 animate-slideUp">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Emoji</span>
            <button onClick={() => setShowEmoji(false)} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => addEmoji(emoji)}
                className="w-9 h-9 flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all active:scale-90"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment options */}
      {showAttach && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 animate-slideUp">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Biriktirish</span>
            <button onClick={() => setShowAttach(false)} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-3">
            <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all">
              <Image size={20} />
              <span className="text-[10px] font-medium">Rasm</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all">
              <MapPin size={20} />
              <span className="text-[10px] font-medium">Joylashuv</span>
            </button>
            <button className="flex flex-col items-center gap-1 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all">
              <Paperclip size={20} />
              <span className="text-[10px] font-medium">Fayl</span>
            </button>
          </div>
        </div>
      )}

      {/* Recording UI */}
      {isRecording ? (
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={cancelRecording}
            className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-orange-500 animate-pulse" style={{ width: `${Math.min((recordingTime / 60) * 100, 100)}%` }} />
            </div>
            <span className="text-xs font-mono font-medium text-gray-600 dark:text-gray-300 min-w-[36px]">
              {formatTime(recordingTime)}
            </span>
          </div>

          <button
            onClick={stopRecording}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <form className="flex items-center gap-2 p-3" onSubmit={handleSubmit}>
          {/* Attach button */}
          <button
            type="button"
            onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
            className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${showAttach
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-500'
                : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            disabled={disabled}
          >
            <Paperclip size={18} />
          </button>

          {/* Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Xabar yozing..."
              disabled={disabled}
              className="w-full py-2.5 px-4 pr-10 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-gray-700 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 transition-colors ${showEmoji ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                }`}
              disabled={disabled}
            >
              <Smile size={18} />
            </button>
          </div>

          {/* Send or Voice button */}
          {message.trim() ? (
            <button
              type="submit"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 active:scale-95 transition-transform disabled:opacity-50"
              disabled={disabled}
            >
              <Send size={16} className="ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              disabled={disabled}
            >
              <Mic size={17} />
            </button>
          )}
        </form>
      )}
    </div>
  );
};
