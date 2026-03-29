export const API_URL = 'http://192.168.10.180:5001/api';
export const SOCKET_URL = 'http://192.168.10.180:5001';

export const COLORS = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  secondary: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  white: '#FFFFFF',
  black: '#000000',
};

export const CATEGORIES = [
  'Santexnik', 'Elektrik', 'Duradgor', 'Rassomchilik', 'Tozalik',
  'Haydovchi', 'Quruvchi', 'Bog\'bon', 'Kompyuter', 'Boshqa'
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  ACCEPTED: 'Qabul qilindi',
  IN_PROGRESS: 'Jarayonda',
  COMPLETED: 'Bajarildi',
  CANCELLED: 'Bekor qilindi',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  ACCEPTED: '#3B82F6',
  IN_PROGRESS: '#8B5CF6',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};
