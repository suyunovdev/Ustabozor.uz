import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, Mic, X, Image, MapPin, Reply, Loader2 } from 'lucide-react';
import { Message } from '../../types';
import { ApiService } from '../../services/api';
import { toast } from 'react-toastify';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: any[]) => void;
  disabled?: boolean;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

const QUICK_EMOJIS = ['😊', '👍', '❤️', '😂', '🔥', '👏', '🙏', '✅', '👋', '🎉', '💪', '🤝'];

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, replyingTo, onCancelReply }) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      setShowEmoji(false);
      setShowAttach(false);
      if (onCancelReply) onCancelReply();
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Fayl hajmi 5MB dan oshmasin');
      return;
    }

    setIsUploading(true);
    setShowAttach(false);
    setUploadProgress(0);

    // Show preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const uploadedFile = await ApiService.uploadFile(file);
      setUploadProgress(100);


      if (uploadedFile) {
        // Pass attachment in correct format
        const attachment = {
          name: uploadedFile.name,
          url: uploadedFile.url,
          type: uploadedFile.type
        };
        onSendMessage(file.type.startsWith('image/') ? '📷 Rasm' : '📎 Fayl', [attachment]);
        toast.success('Fayl yuklandi');
      } else {
        toast.error('Fayl yuklashda xatolik');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fayl yuklashda xatolik');
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
      setPreviewImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolokatsiya qo\'llab-quvvatlanmaydi');
      return;
    }

    setIsUploading(true);
    setShowAttach(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        onSendMessage(`📍 Mening joylashuvim: ${mapLink}`);
        setIsUploading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Joylashuvni aniqlab bo\'lmadi');
        setIsUploading(false);
      }
    );
  };

  const triggerFileUpload = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
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
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Reply Preview */}
      {replyingTo && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <Reply size={16} className="text-blue-500 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-blue-500">Javob berilmoqda</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{replyingTo.content}</span>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={14} />
          </button>
        </div>
      )}

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

      {/* Attachment options - Enhanced */}
      {showAttach && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900 animate-slideUp">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Paperclip size={14} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">Biriktirish</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Fayl, rasm yoki joylashuvni ulashing</p>
              </div>
            </div>
            <button
              onClick={() => setShowAttach(false)}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-all"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Photo */}
            <button
              onClick={() => triggerFileUpload('image/*')}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-900/10 border border-blue-100 dark:border-blue-800/30 hover:from-blue-100 hover:to-blue-200/50 dark:hover:from-blue-900/30 dark:hover:to-blue-900/20 transition-all active:scale-95 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow">
                <Image size={22} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">Rasm</span>
            </button>

            {/* Location */}
            <button
              onClick={handleLocation}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 border border-green-100 dark:border-green-800/30 hover:from-green-100 hover:to-green-200/50 dark:hover:from-green-900/30 dark:hover:to-green-900/20 transition-all active:scale-95 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-shadow">
                <MapPin size={22} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-green-700 dark:text-green-400">Joylashuv</span>
            </button>

            {/* File */}
            <button
              onClick={() => triggerFileUpload('*/*')}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-900/10 border border-purple-100 dark:border-purple-800/30 hover:from-purple-100 hover:to-purple-200/50 dark:hover:from-purple-900/30 dark:hover:to-purple-900/20 transition-all active:scale-95 shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
                <Paperclip size={22} className="text-white" />
              </div>
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">Fayl</span>
            </button>
          </div>

          {/* Quick tips */}
          <div className="mt-3 p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-800/20">
            <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center">
              💡 <span className="font-medium">Maslahat:</span> Rasm hajmi 5MB dan oshmasin
            </p>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/10 dark:to-gray-900">
          <div className="flex items-center gap-3">
            {previewImage && (
              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-blue-200 dark:border-blue-800 flex-shrink-0">
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Yuklanmoqda...</span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <Loader2 size={20} className="text-blue-500 animate-spin flex-shrink-0" />
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
            disabled={disabled || isUploading}
          >
            {isUploading ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Paperclip size={18} />}
          </button>

          {/* Input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={replyingTo ? "Javob yozing..." : "Xabar yozing..."}
              disabled={disabled || isUploading}
              className="w-full py-2.5 px-4 pr-10 bg-gray-100 dark:bg-gray-800 border-0 rounded-full text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:bg-white dark:focus:bg-gray-700 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 transition-colors ${showEmoji ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                }`}
              disabled={disabled || isUploading}
            >
              <Smile size={18} />
            </button>
          </div>

          {/* Send or Voice button */}
          {message.trim() ? (
            <button
              type="submit"
              className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 active:scale-95 transition-transform disabled:opacity-50"
              disabled={disabled || isUploading}
            >
              <Send size={16} className="ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 flex items-center justify-center hover:bg-gradient-to-br hover:from-blue-500 hover:to-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
              disabled={disabled || isUploading}
            >
              <Mic size={17} />
            </button>
          )}
        </form>
      )}
    </div>
  );
};
