import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AuthContext } from '../hooks/useAuth';
import { AuthAPI, User, UserRole } from '../services/api';
import { registerForPushNotifications } from '../services/pushNotifications';
import { ThemeContext, useThemeState } from '../hooks/useTheme';

function NavigationGuard({ user, loading }: { user: User | null; loading: boolean }) {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inCustomer = segments[0] === '(customer)';
    const inWorker = segments[0] === '(worker)';

    if (!user && !inAuth) {
      router.replace('/(auth)');
    } else if (user) {
      const targetGroup = user.role === UserRole.WORKER ? '(worker)' : '(customer)';
      if (inAuth || (!inCustomer && !inWorker && segments[0] !== 'order' && segments[0] !== 'chat')) {
        router.replace(`/${targetGroup}` as any);
      }
    }
  }, [user, loading, segments]);

  return null;
}

export default function RootLayout() {
  const theme = useThemeState();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthAPI.getStoredUser().then(stored => {
      if (stored) setUserState(stored);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) registerForPushNotifications(user.id).catch(() => {});
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    const { user: u } = await AuthAPI.login(email, password);
    setUserState(u);
  };

  const register = async (payload: any) => {
    const { user: u } = await AuthAPI.register(payload);
    setUserState(u);
  };

  const logout = async () => {
    await AuthAPI.logout();
    setUserState(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      <AuthContext.Provider value={{ user, loading, login, register, logout, setUser: setUserState }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <NavigationGuard user={user} loading={loading} />
        <Slot />
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}
