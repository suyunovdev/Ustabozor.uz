import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, Order, OrderStatus } from '../../services/api';
import { COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../constants';

const TABS = [
  { key: 'ALL', label: 'Barchasi' },
  { key: 'ACTIVE', label: 'Faol' },
  { key: 'COMPLETED', label: 'Bajarilgan' },
];

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const color = ORDER_STATUS_COLORS[order.status] || COLORS.gray[400];
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{order.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.statusText, { color }]}>{ORDER_STATUS_LABELS[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.cardCategory}>{order.category}</Text>
      <Text style={styles.cardLocation} numberOfLines={1}>📍 {order.location}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardPrice}>{order.price.toLocaleString()} so'm</Text>
        <Text style={styles.cardDate}>{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { opacity: 0.5 }]}>
      <View style={[styles.skeletonLine, { width: '70%' }]} />
      <View style={[styles.skeletonLine, { width: '40%' }]} />
      <View style={[styles.skeletonLine, { width: '55%' }]} />
    </View>
  );
}

export default function MyOrders() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('ALL');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await OrdersAPI.getByCustomer(user!.id);
      setOrders(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => {
    fetchOrders(true);
    pollRef.current = setInterval(() => fetchOrders(), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchOrders]);

  const filtered = orders.filter(o => {
    if (tab === 'ACTIVE') return ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status);
    if (tab === 'COMPLETED') return ['COMPLETED', 'CANCELLED'].includes(o.status);
    return true;
  });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mening buyurtmalarim</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{tab === 'COMPLETED' ? '✅' : '📋'}</Text>
          <Text style={styles.emptyTitle}>{tab === 'COMPLETED' ? 'Bajarilgan buyurtma yo\'q' : 'Buyurtma yo\'q'}</Text>
          {tab !== 'COMPLETED' && (
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(customer)/create')}>
              <Text style={styles.emptyBtnText}>+ Buyurtma berish</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={o => o.id}
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push(`/order/${item.id}`)} />
          )}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray[900] },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.gray[100] },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray[500] },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray[900], flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardCategory: { fontSize: 12, color: COLORS.gray[500], marginBottom: 4 },
  cardLocation: { fontSize: 13, color: COLORS.gray[600], marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  cardDate: { fontSize: 12, color: COLORS.gray[400] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray[600], marginBottom: 16 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.gray[200], marginVertical: 5, width: '80%' },
});
