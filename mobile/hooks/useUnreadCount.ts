import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ChatAPI } from '../services/api';
import { useAuth } from './useAuth';

export function useUnreadCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = async () => {
    if (!user?.id) return;
    try {
      const chats = await ChatAPI.getChats(user.id);
      const total = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);
      setCount(total);
    } catch {}
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchCount();
    timerRef.current = setInterval(fetchCount, 15_000);

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') fetchCount();
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      sub.remove();
    };
  }, [user?.id]);

  return count;
}
