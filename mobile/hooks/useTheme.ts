import { createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const THEME_KEY = '@ustabozor_theme';

/* ─── Color tokens ─────────────────────────────────────────────────────────── */
export const lightColors = {
  bg:           '#F8FAFC',
  surface:      '#FFFFFF',
  surfaceAlt:   '#F3F4F6',
  border:       '#E5E7EB',
  borderLight:  '#F3F4F6',
  text:         '#111827',
  textSub:      '#6B7280',
  textMuted:    '#9CA3AF',
  primary:      '#2563EB',
  primaryDark:  '#1D4ED8',
  primaryLight: '#EFF6FF',
  indigo:       '#4F46E5',
  indigoDark:   '#3730A3',
  indigoLight:  '#EEF2FF',
  green:        '#10B981',
  greenLight:   '#ECFDF5',
  red:          '#DC2626',
  redLight:     '#FFF1F2',
  redBorder:    '#FECDD3',
  yellow:       '#F59E0B',
  yellowLight:  '#FFFBEB',
  tabBar:       '#FFFFFF',
  tabBorder:    '#F3F4F6',
  shadow:       '#000000',
  overlay:      'rgba(0,0,0,0.4)',
  card:         '#FFFFFF',
};

export const darkColors = {
  bg:           '#0F172A',
  surface:      '#1E293B',
  surfaceAlt:   '#0F172A',
  border:       '#334155',
  borderLight:  '#1E293B',
  text:         '#F1F5F9',
  textSub:      '#94A3B8',
  textMuted:    '#64748B',
  primary:      '#3B82F6',
  primaryDark:  '#2563EB',
  primaryLight: '#1E3A5F',
  indigo:       '#818CF8',
  indigoDark:   '#4F46E5',
  indigoLight:  '#1E1B4B',
  green:        '#34D399',
  greenLight:   '#064E3B',
  red:          '#F87171',
  redLight:     '#450A0A',
  redBorder:    '#7F1D1D',
  yellow:       '#FBBF24',
  yellowLight:  '#451A03',
  tabBar:       '#1E293B',
  tabBorder:    '#334155',
  shadow:       '#000000',
  overlay:      'rgba(0,0,0,0.7)',
  card:         '#1E293B',
};

export type ThemeColors = typeof lightColors;

/* ─── Context ─────────────────────────────────────────────────────────────── */
export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

export const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

/* ─── Provider state hook ─────────────────────────────────────────────────── */
export function useThemeState() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(val => {
      if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const colors: ThemeColors = isDark ? darkColors : lightColors;

  return { isDark, toggleTheme, colors };
}
