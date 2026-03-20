import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI } from '../../services/api';
import { COLORS, CATEGORIES } from '../../constants';

export default function CreateOrder() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ workerId?: string }>();
  const [form, setForm] = useState({
    title: '', description: '', category: CATEGORIES[0], price: '', location: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.price || !form.location) {
      Alert.alert('Xato', 'Barcha maydonlarni to\'ldiring');
      return;
    }
    setLoading(true);
    try {
      await OrdersAPI.create({
        ...form,
        price: Number(form.price),
        customerId: user!.id,
        ...(params.workerId ? { workerId: params.workerId } : {}),
      });
      Alert.alert('Muvaffaqiyat', 'Buyurtmangiz joylashtirildi!', [
        { text: 'OK', onPress: () => router.push('/(customer)/orders') },
      ]);
    } catch (e: any) {
      Alert.alert('Xato', e.message || 'Buyurtma berishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yangi buyurtma</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Sarlavha</Text>
        <TextInput style={styles.input} placeholder="Masalan: Kran tuzatish" value={form.title} onChangeText={v => update('title', v)} />

        <Text style={styles.label}>Kategoriya</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, form.category === cat && styles.catChipActive]}
              onPress={() => update('category', cat)}
            >
              <Text style={[styles.catText, form.category === cat && styles.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Tavsif</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Ish haqida batafsil yozing..."
          value={form.description}
          onChangeText={v => update('description', v)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Narx (so'm)</Text>
        <TextInput
          style={styles.input}
          placeholder="150000"
          value={form.price}
          onChangeText={v => update('price', v)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Manzil</Text>
        <TextInput
          style={styles.input}
          placeholder="Shahar, tuman, ko'cha..."
          value={form.location}
          onChangeText={v => update('location', v)}
        />

        {params.workerId && (
          <View style={styles.workerNote}>
            <Text style={styles.workerNoteText}>✅ Usta tanlangan — buyurtma to'g'ridan-to'g'ri shu ustaga yuboriladi</Text>
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Buyurtma berish</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[900] },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.gray[600], marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: COLORS.gray[200], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.gray[900], marginBottom: 16 },
  textarea: { height: 100, marginBottom: 16 },
  catScroll: { marginBottom: 16 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.gray[100], marginRight: 8 },
  catChipActive: { backgroundColor: COLORS.primary },
  catText: { fontSize: 13, fontWeight: '600', color: COLORS.gray[600] },
  catTextActive: { color: '#fff' },
  workerNote: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 16 },
  workerNoteText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
