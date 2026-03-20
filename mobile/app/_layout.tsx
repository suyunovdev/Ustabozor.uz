import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../hooks/useAuth';
import { AuthAPI, User, UserRole } from '../services/api';
import { registerForPushNotifications } from '../services/pushNotifications';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const stored = await AuthAPI.getStoredUser();
        if (stored) {
          setUserState(stored);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      registerForPushNotifications(user.id).catch(() => {});
    }
  }, [user?.id]);

  const login = async (phone: string, password: string) => {
    const { user: u } = await AuthAPI.login(phone, password);
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser: setUserState }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="(auth)" />
        ) : user.role === UserRole.WORKER ? (
          <Stack.Screen name="(worker)" />
        ) : (
          <Stack.Screen name="(customer)" />
        )}
        <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      </Stack>
    </AuthContext.Provider>
  );
}
