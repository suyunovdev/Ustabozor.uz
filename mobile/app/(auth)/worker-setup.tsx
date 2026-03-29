import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../services/api';
import { COLORS } from '../../constants';

const SKILLS = ['Santexnika', 'Elektr', 'Tozalash', 'Yuk tashish', 'Qurilish', "Bo'yoqchi", "Bog'bon", 'Haydovchi'];

export default function WorkerSetup() {
  const params = useLocalSearchParams<any>();
  const { register } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [passportUri, setPassportUri] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImage = async (type: 'selfie' | 'passport') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'selfie' ? [1, 1] : [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      if (type === 'selfie') setSelfieUri(result.assets[0].uri);
      else setPassportUri(result.assets[0].uri);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills(p => p.includes(skill) ? p.filter(s => s !== skill) : [...p, skill]);
  };

  const handleComplete = async () => {
    if (skills.length === 0) {
      Alert.alert('Xato', "Kamida bitta ko'nikma tanlang");
      return;
    }
    setLoading(true);
    try {
      await register({ ...params, role: UserRole.WORKER, skills });
    } catch (e: any) {
      Alert.alert('Xato', e.message || "Ro'yxatdan o'tishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.heroBg} />

      {/* Step indicator */}
      <View style={styles.stepWrap}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(1)}>
          <Text style={styles.backText}>← Ortga</Text>
        </TouchableOpacity>
        <View style={styles.stepDots}>
          <View style={[styles.dot, step === 1 && styles.dotActive]} />
          <View style={[styles.dot, step === 2 && styles.dotActive]} />
        </View>
      </View>

      {step === 1 ? (
        /* STEP 1: Documents */
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Profilni Tasdiqlash</Text>
            <Text style={styles.cardSub}>Tasdiqdan o'tish uchun hujjatlarni yuklang</Text>

            {/* Selfie */}
            <TouchableOpacity style={[styles.uploadBox, selfieUri && styles.uploadBoxDone]} onPress={() => pickImage('selfie')}>
              {selfieUri ? (
                <>
                  <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
                  <Text style={styles.uploadDoneText}>✓ Selfie yuklandi</Text>
                </>
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadText}>Selfi olish / yuklash</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Passport */}
            <TouchableOpacity style={[styles.uploadBox, passportUri && styles.uploadBoxDone]} onPress={() => pickImage('passport')}>
              {passportUri ? (
                <>
                  <Image source={{ uri: passportUri }} style={styles.passportPreview} />
                  <Text style={styles.uploadDoneText}>✓ Pasport yuklandi</Text>
                </>
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📄</Text>
                  <Text style={styles.uploadText}>Pasport nusxasini yuklash</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.primaryBtnText}>Davom etish</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* STEP 2: Skills */
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ko'nikmalaringiz</Text>
            <Text style={styles.cardSub}>Qo'lingizdan keladigan ishlarni belgilang</Text>

            <View style={styles.skillsGrid}>
              {SKILLS.map(skill => (
                <TouchableOpacity
                  key={skill}
                  style={[styles.skillChip, skills.includes(skill) && styles.skillChipActive]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text style={[styles.skillText, skills.includes(skill) && styles.skillTextActive]}>
                    {skill} {skills.includes(skill) ? '✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: '#22C55E', shadowColor: '#22C55E' }]}
              onPress={handleComplete}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Ro'yxatdan o'tish</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1e3a8a' },
  heroBg: { position: 'absolute', inset: 0, backgroundColor: '#1e3a8a' },
  stepWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginTop: 60, marginBottom: 16 },
  backText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  stepDots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 24 },
  scroll: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.gray[900], textAlign: 'center', marginBottom: 4 },
  cardSub: { fontSize: 13, color: COLORS.gray[500], textAlign: 'center', marginBottom: 20 },
  uploadBox: {
    borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.gray[300],
    borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 14,
    backgroundColor: COLORS.gray[50],
  },
  uploadBoxDone: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  uploadIcon: { fontSize: 32, marginBottom: 8 },
  uploadText: { fontSize: 14, fontWeight: '600', color: COLORS.gray[600] },
  selfiePreview: { width: 80, height: 80, borderRadius: 40, marginBottom: 8, borderWidth: 2, borderColor: '#22C55E' },
  passportPreview: { width: 120, height: 80, borderRadius: 10, marginBottom: 8, borderWidth: 2, borderColor: '#22C55E' },
  uploadDoneText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  skillChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.gray[200], backgroundColor: '#fff',
  },
  skillChipActive: { borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  skillText: { fontSize: 14, fontWeight: '600', color: COLORS.gray[600] },
  skillTextActive: { color: COLORS.primary },
});
