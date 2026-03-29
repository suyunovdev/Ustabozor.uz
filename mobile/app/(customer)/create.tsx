import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI } from '../../services/api';
import { COLORS } from '../../constants';

const CATS = [
  'Santexnika', 'Elektr', 'Tozalash', 'Yuk tashish',
  'Qurilish', "Bog'bon", 'Dasturlash', 'Dizayn', 'SMM',
];

export default function CreateOrder() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    workerId?: string; workerName?: string; category?: string;
  }>();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(params.category || '');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Toshkent, O\'zbekiston');
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* prefill category from params */
  useEffect(() => {
    if (params.category) setCategory(params.category);
  }, [params.category]);

  /* AI fill (simulated — just pre-fills fields from text) */
  const handleAIFill = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1200)); // simulate network
    const guessedCat = CATS.find(c => aiInput.toLowerCase().includes(c.toLowerCase())) || '';
    const short = aiInput.length > 60 ? aiInput.slice(0, 57) + '...' : aiInput;
    setTitle(short);
    if (guessedCat) setCategory(guessedCat);
    setDescription(aiInput);
    setAiResult('AI matn asosida to\'ldirildi. Iltimos tekshirib tasdiqlang.');
    setAiLoading(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || !category || !price.trim() || !location.trim()) {
      Alert.alert('Xato', 'Barcha maydonlarni to\'ldiring');
      return;
    }
    setLoading(true);
    try {
      await OrdersAPI.create({
        title,
        description: description || title,
        category,
        price: Number(price),
        location,
        customerId: user!._id,
        ...(params.workerId ? { workerId: params.workerId } : {}),
      });
      Alert.alert('✅ Muvaffaqiyat', 'Buyurtmangiz joylashtirildi!', [
        { text: 'OK', onPress: () => router.push('/(customer)/orders') },
      ]);
    } catch (e: any) {
      Alert.alert('Xato', e.message || 'Buyurtma berishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buyurtma Berish</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── SELECTED WORKER CARD ── */}
        {params.workerId && params.workerName && (
          <View style={styles.workerCard}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>
                {params.workerName.charAt(0)}
              </Text>
            </View>
            <View style={styles.workerCardBody}>
              <Text style={styles.workerCardLabel}>Tanlangan ishchi</Text>
              <Text style={styles.workerCardName}>{params.workerName}</Text>
            </View>
            <View style={styles.workerBadge}>
              <Text style={styles.workerBadgeText}>✓ Yollash uchun</Text>
            </View>
          </View>
        )}

        {/* ── AI ASSISTANT ── */}
        <View style={styles.aiCard}>
          <View style={styles.aiCircle} />
          <View style={styles.aiHeader}>
            <Text style={styles.aiStar}>✨</Text>
            <Text style={styles.aiTitle}>AI Yordamchi</Text>
          </View>
          <Text style={styles.aiSubtitle}>
            Nimaga muhtojligingizni yozing, biz detallarni to'ldirib beramiz.
          </Text>
          <View style={styles.aiInputWrap}>
            <TextInput
              style={styles.aiInput}
              placeholder="Masalan: Oshxonadagi kran suv oqizyapti, zudlik bilan usta kerak."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={aiInput}
              onChangeText={setAiInput}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.aiBtn, (!aiInput.trim() || aiLoading) && styles.aiBtnDisabled]}
              onPress={handleAIFill}
              disabled={!aiInput.trim() || aiLoading}
            >
              {aiLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.aiBtnText}>✨ To'ldirish</Text>
              }
            </TouchableOpacity>
          </View>
          {aiResult && (
            <View style={styles.aiResult}>
              <Text style={styles.aiResultText}>✅ {aiResult}</Text>
            </View>
          )}
        </View>

        {/* ── FORM ── */}
        <Text style={styles.label}>Ish nomi</Text>
        <TextInput
          style={styles.input}
          placeholder="Masalan: Kranni tuzatish"
          placeholderTextColor="#9CA3AF"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Kategoriya</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {CATS.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Tavsif (ixtiyoriy)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Ish haqida batafsil yozing..."
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Taklif narxi (so'm)</Text>
        <TextInput
          style={styles.input}
          placeholder="50000"
          placeholderTextColor="#9CA3AF"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        {/* Location */}
        <Text style={styles.label}>📍 Ish joyi</Text>
        <TouchableOpacity style={styles.locationBtn} activeOpacity={0.8}>
          <View style={styles.locationIconWrap}>
            <Text style={styles.locationIcon}>🗺</Text>
          </View>
          <View style={styles.locationBody}>
            <TextInput
              style={styles.locationInput}
              placeholder="Xaritadan joyni tanlang"
              placeholderTextColor="#3B82F6"
              value={location}
              onChangeText={setLocation}
            />
            <Text style={styles.locationSub}>
              {location ? '✓ Joylashuv kiritilgan' : 'Ish bajarilishi kerak bo\'lgan joyni belgilang'}
            </Text>
          </View>
          <Text style={styles.locationEdit}>✏️</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>E'lon qilish  →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 22, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

  scroll: { padding: 20, paddingBottom: 48 },

  /* selected worker card */
  workerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#10B981',
    backgroundImage: 'linear-gradient(135deg, #10B981, #059669)',
    borderRadius: 20, padding: 16, marginBottom: 20,
    // RN gradient via bg:
    // use #10B981 as solid fallback
  },
  workerAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  workerAvatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  workerCardBody:   { flex: 1 },
  workerCardLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  workerCardName:   { fontSize: 17, fontWeight: '700', color: '#fff' },
  workerBadge:      { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  workerBadgeText:  { fontSize: 11, fontWeight: '700', color: '#fff' },

  /* ai card */
  aiCard: {
    backgroundColor: '#2563EB', borderRadius: 24, padding: 20, marginBottom: 24,
    overflow: 'hidden', position: 'relative',
  },
  aiCircle:   { position: 'absolute', top: -40, right: -40, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.08)' },
  aiHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  aiStar:     { fontSize: 18, marginRight: 6 },
  aiTitle:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  aiSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14, lineHeight: 18 },
  aiInputWrap:{ position: 'relative' },
  aiInput:    {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    padding: 14, paddingBottom: 46, color: '#fff', fontSize: 13,
    minHeight: 90, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  aiBtn:      {
    position: 'absolute', bottom: 10, right: 10,
    backgroundColor: '#1E3A8A', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  aiBtnDisabled: { opacity: 0.5 },
  aiBtnText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  aiResult:   { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10 },
  aiResultText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  /* form */
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    color: '#111827', backgroundColor: '#fff', marginBottom: 18,
  },
  textarea: { height: 100 },

  /* category pills */
  catRow: { marginBottom: 18 },
  catChip:      { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff', marginRight: 8 },
  catChipActive:{ borderColor: COLORS.primary, backgroundColor: '#EFF6FF' },
  catText:      { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  catTextActive:{ color: COLORS.primary },

  /* location */
  locationBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#93C5FD',
    borderRadius: 14, padding: 14, backgroundColor: '#EFF6FF', marginBottom: 20,
  },
  locationIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  locationIcon:     { fontSize: 20 },
  locationBody:     { flex: 1 },
  locationInput:    { fontSize: 14, fontWeight: '600', color: '#111827', padding: 0 },
  locationSub:      { fontSize: 11, color: '#6B7280', marginTop: 2 },
  locationEdit:     { fontSize: 16 },

  /* submit */
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 4,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
