import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants';

const { width } = Dimensions.get('window');

type AuthView = 'LANDING' | 'LOGIN' | 'REGISTER';

const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score: 1, label: 'Juda zaif', color: '#EF4444' };
  if (score === 2) return { score: 2, label: 'Zaif', color: '#F97316' };
  if (score === 3) return { score: 3, label: "O'rtacha", color: '#EAB308' };
  if (score === 4) return { score: 4, label: 'Kuchli', color: '#22C55E' };
  return { score: 5, label: 'Juda kuchli', color: '#10B981' };
};

export default function AuthScreen() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<AuthView>('LANDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPass, setShowLoginPass] = useState(false);

  // Register
  const [regData, setRegData] = useState({ name: '', surname: '', email: '', phone: '', password: '' });
  const [showRegPass, setShowRegPass] = useState(false);

  const strength = getPasswordStrength(regData.password);

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError("Email va parolni kiriting");
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(loginEmail.trim(), loginPassword);
    } catch (e: any) {
      setError(e.message || "Email yoki parol noto'g'ri");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterNext = () => {
    if (!regData.name || !regData.surname || !regData.email || !regData.phone || !regData.password) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }
    if (regData.password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    setError('');
    router.push('/(auth)/role-select' as any);
    // Pass regData via global store — use params instead
    router.push({ pathname: '/(auth)/role-select', params: { ...regData } } as any);
  };

  // LANDING
  if (view === 'LANDING') {
    return (
      <View style={styles.root}>
        <View style={styles.heroBg} />
        {/* Brand */}
        <View style={styles.brandWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.brandName}>IshTop</Text>
          <Text style={styles.brandSub}>Ish toping. Yordam oling. Tez.</Text>
        </View>

        {/* Buttons */}
        <View style={styles.landingBtns}>
          <TouchableOpacity style={styles.loginBtn} onPress={() => { setView('LOGIN'); setError(''); }}>
            <Text style={styles.loginBtnText}>Kirish</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.registerBtn} onPress={() => { setView('REGISTER'); setError(''); }}>
            <Text style={styles.registerBtnText}>Ro'yxatdan o'tish</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>yoki</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn}>
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Google bilan kirish</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2024 IshTop Inc.</Text>
      </View>
    );
  }

  // LOGIN
  if (view === 'LOGIN') {
    return (
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.heroBg} />
        <View style={styles.brandWrapSmall}>
          <View style={styles.logoBoxSmall}>
            <Text style={styles.logoIconSmall}>⚡</Text>
          </View>
          <Text style={styles.brandNameSmall}>IshTop</Text>
        </View>

        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setView('LANDING')}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.cardTitle}>Xush kelibsiz</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            {/* Email */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>✉</Text>
              <TextInput
                style={styles.input}
                placeholder="Elektron pochta"
                value={loginEmail}
                onChangeText={setLoginEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.gray[400]}
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="Parol"
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry={!showLoginPass}
                placeholderTextColor={COLORS.gray[400]}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowLoginPass(p => !p)}>
                <Text style={styles.eyeIcon}>{showLoginPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Parolni unutdingizmi?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Kirish</Text>}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLineGray} />
              <Text style={styles.dividerTextGray}>yoki</Text>
              <View style={styles.dividerLineGray} />
            </View>

            <TouchableOpacity style={styles.googleBtnCard}>
              <Text style={[styles.googleIcon, { color: '#4285F4', fontSize: 16, fontWeight: '800' }]}>G</Text>
              <Text style={styles.googleBtnCardText}>Google bilan kirish</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.switchBtn} onPress={() => { setView('REGISTER'); setError(''); }}>
              <Text style={styles.switchText}>Hisobingiz yo'qmi? <Text style={styles.switchLink}>Ro'yxatdan o'ting</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // REGISTER
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.heroBg} />
      <View style={styles.brandWrapSmall}>
        <View style={styles.logoBoxSmall}>
          <Text style={styles.logoIconSmall}>⚡</Text>
        </View>
        <Text style={styles.brandNameSmall}>IshTop</Text>
      </View>

      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setView('LANDING')}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.cardTitle}>Ro'yxatdan o'tish</Text>
          <Text style={styles.cardSub}>Ma'lumotlaringizni to'ldiring</Text>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          {/* Name row */}
          <View style={styles.row}>
            <View style={[styles.inputWrap, { flex: 1, marginRight: 6 }]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput style={styles.input} placeholder="Ism" value={regData.name}
                onChangeText={v => setRegData(p => ({ ...p, name: v }))} placeholderTextColor={COLORS.gray[400]} />
            </View>
            <View style={[styles.inputWrap, { flex: 1, marginLeft: 6 }]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput style={styles.input} placeholder="Familiya" value={regData.surname}
                onChangeText={v => setRegData(p => ({ ...p, surname: v }))} placeholderTextColor={COLORS.gray[400]} />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput style={styles.input} placeholder="Elektron pochta" value={regData.email}
              onChangeText={v => setRegData(p => ({ ...p, email: v }))}
              keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.gray[400]} />
          </View>

          {/* Phone */}
          <View style={styles.inputWrap}>
            <Text style={[styles.inputIcon, { fontSize: 13, fontWeight: '700', color: COLORS.gray[500] }]}>+998</Text>
            <TextInput style={[styles.input, { paddingLeft: 8 }]} placeholder="90 123 45 67"
              value={regData.phone} onChangeText={v => setRegData(p => ({ ...p, phone: v }))}
              keyboardType="phone-pad" placeholderTextColor={COLORS.gray[400]} />
          </View>

          {/* Password */}
          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput style={[styles.input, { paddingRight: 44 }]} placeholder="Parol yarating"
              value={regData.password} onChangeText={v => setRegData(p => ({ ...p, password: v }))}
              secureTextEntry={!showRegPass} placeholderTextColor={COLORS.gray[400]} />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowRegPass(p => !p)}>
              <Text style={styles.eyeIcon}>{showRegPass ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Password strength */}
          {regData.password.length > 0 && (
            <View style={styles.strengthWrap}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4, 5].map(i => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength.score ? strength.color : COLORS.gray[200] }]} />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}

          <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={handleRegisterNext} disabled={loading}>
            <Text style={styles.primaryBtnText}>Davom etish →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchBtn} onPress={() => { setView('LOGIN'); setError(''); }}>
            <Text style={styles.switchText}>Akkauntingiz bormi? <Text style={styles.switchLink}>Kirish</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e3a8a' },
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: '65%', backgroundColor: '#1e3a8a', borderBottomLeftRadius: 48, borderBottomRightRadius: 48 },
  brandWrap: { alignItems: 'center', marginTop: 80, marginBottom: 40 },
  brandWrapSmall: { alignItems: 'center', marginTop: 56, marginBottom: 16, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  logoBox: { width: 88, height: 88, backgroundColor: '#fff', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  logoBoxSmall: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoIcon: { fontSize: 44 },
  logoIconSmall: { fontSize: 20 },
  brandName: { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  brandNameSmall: { fontSize: 24, fontWeight: '800', color: '#fff' },
  brandSub: { fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  landingBtns: { paddingHorizontal: 24, gap: 12 },
  loginBtn: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  loginBtnText: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  registerBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  registerBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerLineGray: { flex: 1, height: 1, backgroundColor: COLORS.gray[200] },
  dividerText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  dividerTextGray: { fontSize: 13, color: COLORS.gray[400], paddingHorizontal: 8 },
  googleBtn: { backgroundColor: '#fff', borderRadius: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.gray[700] },
  footer: { position: 'absolute', bottom: 20, alignSelf: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  formScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6, position: 'relative' },
  closeBtn: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: COLORS.gray[400] },
  cardTitle: { fontSize: 24, fontWeight: '700', color: COLORS.gray[900], textAlign: 'center', marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.gray[500], textAlign: 'center', marginBottom: 16 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, color: '#DC2626', textAlign: 'center', fontWeight: '600' },
  row: { flexDirection: 'row' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.gray[200], borderRadius: 14, backgroundColor: COLORS.gray[50], paddingHorizontal: 12, marginBottom: 12, height: 52 },
  inputIcon: { fontSize: 16, marginRight: 8, color: COLORS.gray[400] },
  input: { flex: 1, fontSize: 15, color: COLORS.gray[900], height: 52 },
  eyeBtn: { position: 'absolute', right: 12 },
  eyeIcon: { fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  googleBtnCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.gray[50], borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.gray[200] },
  googleBtnCardText: { fontSize: 15, fontWeight: '600', color: COLORS.gray[700] },
  switchBtn: { marginTop: 16, alignItems: 'center' },
  switchText: { fontSize: 14, color: COLORS.gray[500] },
  switchLink: { color: COLORS.primary, fontWeight: '700' },
  strengthWrap: { marginBottom: 8 },
  strengthBars: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  strengthBar: { flex: 1, height: 4, borderRadius: 4 },
  strengthLabel: { fontSize: 12, fontWeight: '600' },
});
