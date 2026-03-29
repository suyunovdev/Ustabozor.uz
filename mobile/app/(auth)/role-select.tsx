import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../services/api';
import { COLORS } from '../../constants';

export default function RoleSelect() {
  const params = useLocalSearchParams<{ name: string; surname: string; email: string; phone: string; password: string }>();
  const { register } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRole = async (role: UserRole) => {
    if (role === UserRole.WORKER) {
      router.push({ pathname: '/(auth)/worker-setup', params } as any);
      return;
    }
    setLoading(true);
    try {
      await register({ ...params, role });
    } catch (e: any) {
      Alert.alert('Xato', e.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.heroBg} />

      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backText}>← Ortga</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Rolni tanlang</Text>

      <View style={styles.cardsWrap}>
        <TouchableOpacity style={styles.roleCard} onPress={() => handleRole(UserRole.CUSTOMER)} disabled={loading}>
          <View style={[styles.roleIcon, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.roleEmoji}>👤</Text>
          </View>
          <View style={styles.roleBody}>
            <Text style={styles.roleTitle}>Mijoz (Ish beruvchi)</Text>
            <Text style={styles.roleDesc}>Ishchi yollash va xizmatlardan foydalanish</Text>
          </View>
          <Text style={styles.roleArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.roleCard} onPress={() => handleRole(UserRole.WORKER)} disabled={loading}>
          <View style={[styles.roleIcon, { backgroundColor: '#22C55E' }]}>
            <Text style={styles.roleEmoji}>🔧</Text>
          </View>
          <View style={styles.roleBody}>
            <Text style={styles.roleTitle}>Ishchi (Usta)</Text>
            <Text style={styles.roleDesc}>Buyurtmalar olish va daromad qilish</Text>
          </View>
          <Text style={styles.roleArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e3a8a' },
  heroBg: { position: 'absolute', inset: 0, backgroundColor: '#1e3a8a' },
  backBtn: { marginTop: 60, marginLeft: 24, marginBottom: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 32 },
  cardsWrap: { paddingHorizontal: 20, gap: 16 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  roleIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  roleEmoji: { fontSize: 26 },
  roleBody: { flex: 1 },
  roleTitle: { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 4 },
  roleDesc: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  roleArrow: { fontSize: 24, color: 'rgba(255,255,255,0.5)' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
});
