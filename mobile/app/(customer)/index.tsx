import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { UsersAPI, ChatAPI, User } from '../../services/api';
import { COLORS } from '../../constants';

/* ─── CATEGORIES ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: 1, name: 'Santexnika',  icon: '🚿', bg: '#EFF6FF' },
  { id: 2, name: 'Elektr',      icon: '💡', bg: '#FEFCE8' },
  { id: 3, name: 'Tozalash',    icon: '✨', bg: '#FAF5FF' },
  { id: 4, name: 'Yuk tashish', icon: '📦', bg: '#FFF7ED' },
  { id: 5, name: 'Qurilish',    icon: '🧱', bg: '#F3F4F6' },
  { id: 6, name: "Bog'bon",     icon: '🌿', bg: '#F0FDF4' },
  { id: 7, name: 'Dasturlash',  icon: '💻', bg: '#EEF2FF' },
  { id: 8, name: 'Dizayn',      icon: '🎨', bg: '#FDF2F8' },
  { id: 9, name: 'SMM',         icon: '📱', bg: '#ECFEFF' },
];

/* ─── SORT ───────────────────────────────────────────────────────────────── */
type SortKey = 'online' | 'rating' | 'reviews' | 'price';
const SORT_PILLS: { key: SortKey; label: string }[] = [
  { key: 'online',  label: '🟢 Online' },
  { key: 'rating',  label: '⭐ Reyting' },
  { key: 'reviews', label: '💬 Baholar' },
  { key: 'price',   label: '💰 Narx' },
];

const sortWorkers = (data: User[], key: SortKey): User[] =>
  [...data].sort((a, b) => {
    if (key === 'online') {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
      return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
    }
    if (key === 'rating')  return (b.rating ?? 0) - (a.rating ?? 0);
    if (key === 'reviews') return (b.ratingCount ?? 0) - (a.ratingCount ?? 0);
    if (key === 'price')   return (a.hourlyRate ?? 0) - (b.hourlyRate ?? 0);
    return 0;
  });

/* ─── SKELETON ───────────────────────────────────────────────────────────── */
const WorkerSkeleton = () => (
  <View style={sk.card}>
    <View style={sk.avatar} />
    <View style={sk.lines}>
      <View style={[sk.line, { width: 110 }]} />
      <View style={[sk.line, { width: 80, marginTop: 6 }]} />
      <View style={[sk.line, { width: 60, marginTop: 6 }]} />
    </View>
    <View style={sk.btns}>
      <View style={sk.btnSm} />
      <View style={sk.btnLg} />
    </View>
  </View>
);
const sk = StyleSheet.create({
  card:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  avatar:{ width: 56, height: 56, borderRadius: 14, backgroundColor: '#E2E8F0', marginRight: 12 },
  lines: { flex: 1 },
  line:  { height: 12, backgroundColor: '#E2E8F0', borderRadius: 6 },
  btns:  { flexDirection: 'row', gap: 8, marginLeft: 8 },
  btnSm: { width: 36, height: 36, backgroundColor: '#E2E8F0', borderRadius: 10 },
  btnLg: { width: 64, height: 36, backgroundColor: '#E2E8F0', borderRadius: 10 },
});

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();

  const [allWorkers, setAllWorkers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('online');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UsersAPI.getWorkers()
      .then(data => {
        setAllWorkers(data);
        setWorkers(sortWorkers(data, 'online'));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const applyFilter = useCallback((q: string, key: SortKey, base: User[]) => {
    const query = q.toLowerCase().trim();
    const filtered = query
      ? base.filter(w =>
          `${w.name} ${w.surname}`.toLowerCase().includes(query) ||
          (w.skills ?? []).some(s => s.toLowerCase().includes(query))
        )
      : base;
    setWorkers(sortWorkers(filtered, key));
  }, []);

  const handleSearch = (q: string) => {
    setSearch(q);
    applyFilter(q, sortKey, allWorkers);
  };

  const handleSort = (key: SortKey) => {
    setSortKey(key);
    applyFilter(search, key, allWorkers);
  };

  const handleChat = async (workerId: string) => {
    if (!user) return;
    try {
      const chat = await ChatAPI.createOrGet(user._id, workerId);
      router.push(`/chat/${(chat as any)._id || (chat as any).id}` as any);
    } catch {
      Alert.alert('Xato', "Chat ochishda xatolik");
    }
  };

  const initials = (u?: User | null) =>
    u ? `${u.name?.charAt(0) ?? ''}${u.surname?.charAt(0) ?? ''}` : 'U';

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>

      {/* ── GRADIENT HEADER ── */}
      <View style={styles.header}>
        <View style={styles.blurCircle} />

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.manzilLabel}>Manzil</Text>
            <View style={styles.manzilRow}>
              <Text style={styles.manzilPin}>📍</Text>
              <Text style={styles.manzilText}>Toshkent, O'zbekiston</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => router.push('/(customer)/profile')}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials(user)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.heroTitle}>Bugun qanday xizmat{'\n'}kerak?</Text>

        {/* Search bar */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Ism yoki ko'nikma bo'yicha qidirish..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── CATEGORIES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kategoriyalar</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={styles.catItem}
              onPress={() =>
                router.push({ pathname: '/(customer)/create', params: { category: cat.name } } as any)
              }
            >
              <View style={[styles.catBox, { backgroundColor: cat.bg }]}>
                <Text style={styles.catEmoji}>{cat.icon}</Text>
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── TOP WORKERS ── */}
      <View style={styles.section}>
        <View style={styles.workerHeader}>
          <Text style={styles.sectionTitle}>Top Ishchilar</Text>
          <TouchableOpacity>
            <Text style={styles.mapLink}>Xaritada ko'rish</Text>
          </TouchableOpacity>
        </View>

        {/* Sort pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
          {SORT_PILLS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.pill, sortKey === p.key && styles.pillActive]}
              onPress={() => handleSort(p.key)}
            >
              <Text style={[styles.pillText, sortKey === p.key && styles.pillTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Skeleton loaders */}
        {loading && [0,1,2,3].map(i => <WorkerSkeleton key={i} />)}

        {/* Empty search state */}
        {!loading && workers.length === 0 && search ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>"{search}" bo'yicha natija topilmadi</Text>
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styles.emptyLink}>Tozalash</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Worker cards */}
        {!loading && workers.map(worker => (
          <View key={worker._id} style={styles.workerCard}>
            {/* Avatar */}
            <View style={styles.avatarWrap}>
              {worker.avatar ? (
                <Image source={{ uri: worker.avatar }} style={styles.workerAvatar} />
              ) : (
                <View style={[styles.workerAvatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                    {worker.name?.charAt(0) ?? '?'}
                  </Text>
                </View>
              )}
              {worker.isOnline && <View style={styles.onlineDot} />}
            </View>

            {/* Info */}
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>
                {worker.name} {worker.surname?.charAt(0)}.
              </Text>
              <Text style={styles.workerSkill}>
                {(worker.skills ?? [])[0] ?? ''}{' • '}
                {worker.isOnline
                  ? <Text style={styles.onlineText}>Online</Text>
                  : <Text style={styles.offlineText}>Offline</Text>
                }
              </Text>
              <View style={styles.ratingRow}>
                {worker.rating != null ? (
                  <>
                    <Text style={styles.starIcon}>⭐</Text>
                    <Text style={styles.ratingVal}>{worker.rating?.toFixed(1)}</Text>
                    <Text style={styles.ratingCount}>({worker.ratingCount ?? 0} baho)</Text>
                  </>
                ) : (
                  <Text style={styles.noRating}>Baholanmagan</Text>
                )}
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.cardBtns}>
              <TouchableOpacity style={styles.chatBtn} onPress={() => handleChat(worker._id)}>
                <Text style={styles.chatBtnIcon}>💬</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.hireBtn}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/create',
                    params: { workerId: worker._id, workerName: worker.name },
                  } as any)
                }
              >
                <Text style={styles.hireBtnText}>Yollash</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* gradient header */
  header: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 32,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  blurCircle: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  manzilLabel:  { color: '#BFDBFE', fontSize: 12, marginBottom: 2 },
  manzilRow:    { flexDirection: 'row', alignItems: 'center' },
  manzilPin:    { fontSize: 15, marginRight: 4 },
  manzilText:   { color: '#fff', fontSize: 16, fontWeight: '600' },
  avatarCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  avatarText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  heroTitle:    { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 36, marginBottom: 20 },

  /* search */
  searchWrap:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 14, height: 52, shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  searchIcon:  { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827' },
  searchClear: { fontSize: 16, color: '#9CA3AF', paddingLeft: 8 },

  /* sections */
  section:      { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 },

  /* categories 3-column grid */
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catItem: { width: '30%', alignItems: 'center' },
  catBox:  { width: '100%', aspectRatio: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catEmoji:{ fontSize: 28 },
  catName: { fontSize: 11, fontWeight: '600', color: '#4B5563', textAlign: 'center' },

  /* worker section header */
  workerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mapLink:      { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  /* sort pills */
  pillsRow:       { marginBottom: 14 },
  pill:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#fff', marginRight: 8 },
  pillActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText:       { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  pillTextActive: { color: '#fff' },

  /* worker card */
  workerCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  avatarWrap:       { position: 'relative', marginRight: 12 },
  workerAvatar:     { width: 56, height: 56, borderRadius: 14, borderWidth: 2, borderColor: '#E2E8F0' },
  avatarFallback:   { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  onlineDot:        { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff' },
  workerInfo:       { flex: 1 },
  workerName:       { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  workerSkill:      { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  onlineText:       { color: '#16A34A', fontWeight: '700' },
  offlineText:      { color: '#9CA3AF' },
  ratingRow:        { flexDirection: 'row', alignItems: 'center' },
  starIcon:         { fontSize: 11, marginRight: 3 },
  ratingVal:        { fontSize: 12, fontWeight: '700', color: '#111827', marginRight: 3 },
  ratingCount:      { fontSize: 11, color: '#9CA3AF' },
  noRating:         { fontSize: 11, color: '#9CA3AF' },
  cardBtns:         { flexDirection: 'row', gap: 8, marginLeft: 6 },
  chatBtn:          { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  chatBtnIcon:      { fontSize: 17 },
  hireBtn:          { paddingHorizontal: 14, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  hireBtnText:      { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  /* empty */
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  emptyLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});
