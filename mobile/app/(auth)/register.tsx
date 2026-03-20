import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../services/api';
import { COLORS } from '../../constants';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', surname: '', phone: '', password: '' });
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const update = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.password) {
      Alert.alert('Xato', 'Barcha maydonlarni to\'ldiring');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Xato', 'Parol kamida 6 belgidan iborat bo\'lishi kerak');
      return;
    }
    setLoading(true);
    try {
      await register({ ...form, role });
    } catch (e: any) {
      Alert.alert('Xato', e.message || 'Ro\'yxatdan o\'tishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Orqaga</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Ro'yxatdan o'tish</Text>

        {/* Role select */}
        <Text style={styles.label}>Siz kim sifatida ro'yxatdan o'tmoqchisiz?</Text>
        <View style={styles.roleRow}>
          {[
            { value: UserRole.CUSTOMER, label: '👤 Mijoz', desc: 'Ish beraman' },
            { value: UserRole.WORKER, label: '🔧 Usta', desc: 'Ish qilaman' },
          ].map(r => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleCard, role === r.value && styles.roleCardActive]}
              onPress={() => setRole(r.value)}
            >
              <Text style={[styles.roleLabel, role === r.value && styles.roleTextActive]}>{r.label}</Text>
              <Text style={[styles.roleDesc, role === r.value && styles.roleDescActive]}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fields */}
        <Text style={styles.label}>Ism</Text>
        <TextInput style={styles.input} placeholder="Ismingiz" value={form.name} onChangeText={v => update('name', v)} />

        <Text style={styles.label}>Familiya</Text>
        <TextInput style={styles.input} placeholder="Familiyangiz" value={form.surname} onChangeText={v => update('surname', v)} />

        <Text style={styles.label}>Telefon</Text>
        <TextInput style={styles.input} placeholder="+998 90 000 00 00" value={form.phone} onChangeText={v => update('phone', v)} keyboardType="phone-pad" />

        <Text style={styles.label}>Parol</Text>
        <View style={styles.passWrap}>
          <TextInput
            style={[styles.input, { paddingRight: 48, marginBottom: 0 }]}
            placeholder="Kamida 6 belgi"
            value={form.password}
            onChangeText={v => update('password', v)}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
            <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        {/* Password strength */}
        {form.password.length > 0 && (
          <View style={styles.strengthWrap}>
            {[1,2,3,4,5].map(i => {
              const score = form.password.length >= 8 && /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) ? 5
                : form.password.length >= 6 ? 3 : 1;
              return (
                <View key={i} style={[styles.strengthBar, { backgroundColor: i <= score ? (score >= 5 ? '#10B981' : score >= 3 ? '#F59E0B' : '#EF4444') : COLORS.gray[200] }]} />
              );
            })}
          </View>
        )}

        <TouchableOpacity style={[styles.btn, { marginTop: 20 }]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Ro'yxatdan o'tish</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.link}>
          <Text style={styles.linkText}>Akkount bor? <Text style={styles.linkBold}>Kirish</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingTop: 60 },
  back: { marginBottom: 16 },
  backText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.gray[900], marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray[600], marginBottom: 6, marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.gray[200], borderRadius: 14,
    padding: 14, alignItems: 'center',
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  roleLabel: { fontSize: 15, fontWeight: '700', color: COLORS.gray[700] },
  roleTextActive: { color: COLORS.primary },
  roleDesc: { fontSize: 12, color: COLORS.gray[400], marginTop: 2 },
  roleDescActive: { color: COLORS.primary },
  input: {
    borderWidth: 1.5, borderColor: COLORS.gray[200], borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.gray[900], marginBottom: 4,
  },
  passWrap: { position: 'relative', marginBottom: 4 },
  eyeBtn: { position: 'absolute', right: 14, top: 12 },
  eyeText: { fontSize: 18 },
  strengthWrap: { flexDirection: 'row', gap: 4, marginVertical: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 4 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 14, color: COLORS.gray[500] },
  linkBold: { color: COLORS.primary, fontWeight: '700' },
});
