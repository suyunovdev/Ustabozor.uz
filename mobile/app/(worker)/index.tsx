import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, ChatAPI, UsersAPI, Order, OrderStatus } from '../../services/api';
import { COLORS } from '../../constants';

/* ─── CONSTANTS ─────────────────────────────────────────────────────────── */
const CATEGORIES = [
  'Barchasi', 'Santexnika', 'Elektr', 'Tozalash', 'Yuk tashish',
  'Qurilish', "Bog'bon", 'Dasturlash', 'Dizayn', 'SMM',
];

type SortKey = 'newest' | 'price_high' | 'price_low';
const SORT_OPTS: { key: SortKey; label: string }[] = [
  { key: 'newest',     label: 'Eng yangi' },
  { key: 'price_high', label: 'Eng qimmat' },
  { key: 'price_low',  label: 'Eng arzon' },
];

const getRelativeTime = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Hozirgina';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24)  return `${hrs} soat oldin`;
  return `${Math.floor(diff / 86400000)} kun oldin`;
};

/* ─── SKELETON ───────────────────────────────────────────────────────────── */
const JobSkeleton = () => (
  <View style={[styles.card, { opacity: 0.5 }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
      <View style={{ width: 70, height: 20, backgroundColor: '#E2E8F0', borderRadius: 6 }} />
      <View style={{ width: 50, height: 14, backgroundColor: '#E2E8F0', borderRadius: 6 }} />
    </View>
    <View style={{ width: '75%', height: 16, backgroundColor: '#E2E8F0', borderRadius: 6, marginBottom: 8 }} />
    <View style={{ width: '100%', height: 11, backgroundColor: '#E2E8F0', borderRadius: 5, marginBottom: 4 }} />
    <View style={{ width: '65%', height: 11, backgroundColor: '#E2E8F0', borderRadius: 5, marginBottom: 14 }} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1, height: 42, backgroundColor: '#E2E8F0', borderRadius: 12 }} />
      <View style={{ flex: 2, height: 42, backgroundColor: '#E2E8F0', borderRadius: 12 }} />
    </View>
  </View>
);

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
export default function JobFeed() {
  const { user, setUser } = useAuth();
  const router = useRouter();

  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isOnline, setIsOnline]       = useState(user?.isOnline ?? false);
  const [toggling, setToggling]       = useState(false);
  const [accepting, setAccepting]     = useState<string | null>(null);

  const [search, setSearch]           = useState('');
  const [category, setCategory]       = useState('Barchasi');
  const [sortKey, setSortKey]         = useState<SortKey>('newest');

  /* stats from user */
  const completedJobs  = user?.completedJobs ?? 0;
  const todayEarnings  = 0; // not tracked per-day in backend, show 0

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── fetch ── */
  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await OrdersAPI.getAvailableForWorker();
      setAllOrders(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load(true);
    pollRef.current = setInterval(() => load(), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  /* ── filter + sort ── */
  useEffect(() => {
    let result = [...allOrders];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(o =>
        o.title.toLowerCase().includes(q) ||
        o.description.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q)
      );
    }
    if (category !== 'Barchasi') {
      result = result.filter(o => o.category === category);
    }
    result.sort((a, b) => {
      if (sortKey === 'price_high') return b.price - a.price;
      if (sortKey === 'price_low')  return a.price - b.price;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    // AI match (skills match) first
    const skills = user?.skills ?? [];
    if (skills.length > 0) {
      result.sort((a, b) => {
        const am = skills.some(s => a.category.toLowerCase().includes(s.toLowerCase()) || a.title.toLowerCase().includes(s.toLowerCase()));
        const bm = skills.some(s => b.category.toLowerCase().includes(s.toLowerCase()) || b.title.toLowerCase().includes(s.toLowerCase()));
        return (bm ? 1 : 0) - (am ? 1 : 0);
      });
    }
    setOrders(result);
  }, [allOrders, search, category, sortKey, user?.skills]);

  /* ── online toggle ── */
  const handleToggle = async () => {
    if (!user) return;
    setToggling(true);
    try {
      const newStatus = !isOnline;
      await UsersAPI.updateProfile(user.id, (() => {
        const fd = new FormData();
        fd.append('isOnline', String(newStatus));
        return fd;
      })());
      setIsOnline(newStatus);
      setUser({ ...user, isOnline: newStatus });
    } catch {}
    finally { setToggling(false); }
  };

  /* ── accept ── */
  const handleAccept = async (order: Order) => {
    if (!isOnline) {
      Alert.alert("Diqqat", "Ish qabul qilish uchun avval Online rejimiga o'ting!");
      return;
    }
    setAccepting(order.id);
    try {
      await OrdersAPI.update(order.id, { status: OrderStatus.ACCEPTED, workerId: user!.id });
      Alert.alert('✅ Qabul qilindi!', 'Buyurtma ishlarim ro\'yxatiga qo\'shildi.', [
        { text: "Ko'rish", onPress: () => router.push('/(worker)/myjobs') },
        { text: 'OK', onPress: () => load() },
      ]);
    } catch (e: any) {
      Alert.alert('Xato', e.message || 'Qabul qilishda xatolik');
    } finally { setAccepting(null); }
  };

  /* ── chat ── */
  const handleChat = async (customerId: string) => {
    if (!user) return;
    try {
      const chat = await ChatAPI.createOrGet(user.id, customerId);
      router.push(`/chat/${(chat as any)._id || (chat as any).id}` as any);
    } catch { Alert.alert('Xato', 'Chat ochishda xatolik'); }
  };

  /* ── ai match check ── */
  const isAIMatch = (order: Order) => {
    const skills = user?.skills ?? [];
    return skills.some(s =>
      order.category.toLowerCase().includes(s.toLowerCase()) ||
      order.title.toLowerCase().includes(s.toLowerCase())
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#fff"
          />
        }
        stickyHeaderIndices={[1]}
      >
        {/* ── GRADIENT HEADER ── */}
        <View style={styles.header}>
          <View style={styles.blurCircle} />
          {/* top row */}
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Salom, {user?.name}! 👋</Text>
              <Text style={styles.greetingSub}>Yangi ishlarni topib, daromad qiling</Text>
            </View>
            {/* online toggle */}
            <TouchableOpacity
              style={[styles.toggleBtn, isOnline && styles.toggleBtnOnline]}
              onPress={handleToggle}
              disabled={toggling}
            >
              <View style={[styles.toggleDot, isOnline && styles.toggleDotOnline]} />
              <Text style={styles.toggleText}>
                {toggling ? '...' : isOnline ? 'Online' : 'Offline'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statIcon}>💰</Text>
              <Text style={styles.statNum}>
                {todayEarnings > 0 ? todayEarnings.toLocaleString() : '—'}
              </Text>
              <Text style={styles.statLabel}>Bugun</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statIcon}>💼</Text>
              <Text style={styles.statNum}>{completedJobs}</Text>
              <Text style={styles.statLabel}>Bajarilgan</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={styles.statNum}>{user?.rating?.toFixed(1) ?? '—'}</Text>
              <Text style={styles.statLabel}>Reyting</Text>
            </View>
          </View>
        </View>

        {/* ── STICKY FILTER BAR ── */}
        <View style={styles.filterBar}>
          {/* search row */}
          <View style={styles.searchRow}>
            <View style={styles.searchWrap}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Ish qidirish..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.clearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => { setRefreshing(true); load(); }}
            >
              <Text style={styles.refreshIcon}>{refreshing ? '⏳' : '🔄'}</Text>
            </TouchableOpacity>
          </View>

          {/* pills row: sort + categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsRow}>
            {SORT_OPTS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.pill, sortKey === s.key && styles.pillSortActive]}
                onPress={() => setSortKey(s.key)}
              >
                <Text style={[styles.pillText, sortKey === s.key && styles.pillTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.pillDivider} />
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, category === cat && styles.pillCatActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── CONTENT ── */}
        <View style={styles.content}>
          {/* results count */}
          {!loading && (
            <Text style={styles.resultsCount}>
              {orders.length} ta ish topildi
              {search ? ` "${search}" uchun` : ''}
            </Text>
          )}

          {/* skeleton */}
          {loading && [0,1,2].map(i => <JobSkeleton key={i} />)}

          {/* empty */}
          {!loading && orders.length === 0 && (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <Text style={{ fontSize: 36 }}>🔍</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {search || category !== 'Barchasi' ? 'Natija topilmadi' : "Hozircha yangi ishlar yo'q"}
              </Text>
              {(search || category !== 'Barchasi') && (
                <TouchableOpacity onPress={() => { setSearch(''); setCategory('Barchasi'); }}>
                  <Text style={styles.emptyLink}>Filtrlarni tozalash</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* job cards */}
          {!loading && orders.map(order => {
            const aiMatch = isAIMatch(order);
            return (
              <View
                key={order.id}
                style={[styles.card, aiMatch && styles.cardAiMatch]}
              >
                {/* top row */}
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <View style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{order.category}</Text>
                    </View>
                    {aiMatch && (
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>⚡ Sizga mos</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.timeText}>{getRelativeTime(order.createdAt)}</Text>
                </View>

                {/* title + desc */}
                <Text style={styles.cardTitle}>{order.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{order.description}</Text>

                {/* customer info (if available) */}
                {order.customer && (
                  <View style={styles.customerRow}>
                    <View style={styles.customerAvatar}>
                      <Text style={styles.customerAvatarText}>
                        {order.customer.name?.charAt(0) ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{order.customer.name}</Text>
                      <Text style={styles.customerRating}>
                        {order.customer.rating != null
                          ? `⭐ ${order.customer.rating.toFixed(1)}`
                          : 'Baholanmagan'
                        }
                      </Text>
                    </View>
                  </View>
                )}

                {/* location + price */}
                <View style={styles.metaRow}>
                  <Text style={styles.location} numberOfLines={1}>
                    📍 {order.location}
                  </Text>
                  <Text style={styles.price}>{order.price.toLocaleString()} so'm</Text>
                </View>

                {/* action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.chatBtn}
                    onPress={() => order.customerId && handleChat(order.customerId)}
                  >
                    <Text style={styles.chatBtnText}>💬 Yozish</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, !isOnline && styles.acceptBtnDisabled]}
                    onPress={() => handleAccept(order)}
                    disabled={accepting === order.id || !isOnline}
                  >
                    {accepting === order.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.acceptBtnText}>
                          {isOnline ? '✓ Qabul qilish' : "Online bo'ling"}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* header */
  header: {
    backgroundColor: '#2563EB',
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 24,
    overflow: 'hidden', position: 'relative',
  },
  blurCircle: {
    position: 'absolute', top: -50, right: -50,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  greeting:     { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  greetingSub:  { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  toggleBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  toggleBtnOnline:  { backgroundColor: '#22C55E' },
  toggleDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' },
  toggleDotOnline:  { backgroundColor: '#fff' },
  toggleText:       { color: '#fff', fontSize: 13, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBox:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 12, alignItems: 'center' },
  statIcon: { fontSize: 16, marginBottom: 4 },
  statNum:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel:{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* sticky filter bar */
  filterBar:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingTop: 10, paddingBottom: 6 },
  searchRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, marginBottom: 8 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, height: 40 },
  searchIcon: { fontSize: 15, marginRight: 6 },
  searchInput:{ flex: 1, fontSize: 13, color: '#111827' },
  clearText:  { fontSize: 14, color: '#9CA3AF' },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  refreshIcon:{ fontSize: 17 },

  pillsRow:      { paddingHorizontal: 14 },
  pill:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 6 },
  pillSortActive:{ backgroundColor: COLORS.primary },
  pillCatActive: { backgroundColor: '#111827' },
  pillText:      { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  pillTextActive:{ color: '#fff' },
  pillDivider:   { width: 1, height: '80%', backgroundColor: '#E5E7EB', alignSelf: 'center', marginHorizontal: 4 },

  /* content */
  content:      { padding: 14 },
  resultsCount: { fontSize: 11, color: '#9CA3AF', marginBottom: 10 },

  /* job card */
  card:         { backgroundColor: '#fff', borderRadius: 22, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardAiMatch:  { borderColor: '#BBF7D0', borderWidth: 1.5 },
  cardTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTopLeft:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 },
  catBadge:     { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  catBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  aiBadge:      { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  aiBadgeText:  { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  timeText:     { fontSize: 11, color: '#9CA3AF', marginLeft: 8 },
  cardTitle:    { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6, lineHeight: 22 },
  cardDesc:     { fontSize: 13, color: '#6B7280', marginBottom: 10, lineHeight: 18 },

  /* customer */
  customerRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginBottom: 10 },
  customerAvatar:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  customerAvatarText:{ fontSize: 14, fontWeight: '700', color: COLORS.primary },
  customerName:      { fontSize: 13, fontWeight: '600', color: '#111827' },
  customerRating:    { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  /* meta */
  metaRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  location: { fontSize: 12, color: '#6B7280', flex: 1, marginRight: 10 },
  price:    { fontSize: 15, fontWeight: '800', color: '#16A34A' },

  /* action buttons */
  actionRow:        { flexDirection: 'row', gap: 8 },
  chatBtn:          { flex: 1, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  chatBtnText:      { fontSize: 13, fontWeight: '700', color: '#374151' },
  acceptBtn:        { flex: 2, height: 44, borderRadius: 12, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  acceptBtnDisabled:{ backgroundColor: '#D1D5DB' },
  acceptBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  /* empty */
  emptyWrap:   { alignItems: 'center', paddingVertical: 48 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 10 },
  emptyLink:   { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});
