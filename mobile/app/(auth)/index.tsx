import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Xato', 'Telefon va parolni kiriting');
      return;
    }
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (e: any) {
      Alert.alert('Xato', e.message || 'Login amalga oshmadi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>U</Text>
          </View>
          <Text style={styles.brand}>Ustabozor</Text>
          <Text style={styles.tagline}>Professional ustalar platformasi</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Kirish</Text>

          <Text style={styles.label}>Telefon raqam</Text>
          <TextInput
            style={styles.input}
            placeholder="+998 90 000 00 00"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCorrect={false}
          />

          <Text style={styles.label}>Parol</Text>
          <View style={styles.passWrap}>
            <TextInput
              style={[styles.input, styles.passInput]}
              placeholder="Parolni kiriting"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Kirish</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>Akkount yo'qmi? <Text style={styles.linkBold}>Ro'yxatdan o'ting</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primaryLight },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  brand: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  tagline: { fontSize: 14, color: COLORS.gray[500], marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.gray[900], marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray[600], marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.gray[200], borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.gray[900], backgroundColor: COLORS.gray[50], marginBottom: 14,
  },
  passWrap: { position: 'relative' },
  passInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 12 },
  eyeText: { fontSize: 18 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 14, color: COLORS.gray[500] },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
});
