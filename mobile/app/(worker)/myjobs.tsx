import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, Order, OrderStatus } from '../../services/api';
import { COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../constants';

const TABS = [
  { key: 'ACTIVE', label: 'Faol' },
  { key: 'COMPLETED', label: 'Bajarilgan' },
  { key: 'ALL', label: 'Barchasi' },
];

function JobCard({ order, onAction, actionLoading }: { order: Order; onAction: () => void; actionLoading: boolean }) {
  const color = ORDER_STATUS_COLORS[order.status] || COLORS.gray[400];
  const router = useRouter();

  const getAction = () => {
    if (order.status === OrderStatus.ACCEPTED) return { label: 'Boshlash', color: COLORS.secondary };
    if (order.status === OrderStatus.IN_PROGRESS) return { label: 'Tugatish', color: COLORS.primary };
    return null;
  };
  const action = getAction();

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/order/${order.id}`)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{order.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.statusText, { color }]}>{ORDER_STATUS_LABELS[order.status]}</Text>
        </View>
      </View>
      <Text style={styles.cardLocation}>📍 {order.location}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardPrice}>{order.price.toLocaleString()} so'm</Text>
        {action && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: action.color }]} onPress={onAction} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionBtnText}>{action.label}</Text>}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MyJobs() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('ACTIVE');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await OrdersAPI.getAll({ workerId: user!.id });
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
    if (tab === 'ACTIVE') return [OrderStatus.ACCEPTED, OrderStatus.IN_PROGRESS].includes(o.status as OrderStatus);
    if (tab === 'COMPLETED') return [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status as OrderStatus);
    return true;
  });

  const handleAction = async (order: Order) => {
    const newStatus = order.status === OrderStatus.ACCEPTED ? OrderStatus.IN_PROGRESS : OrderStatus.COMPLETED;
    setActionLoading(order.id);
    try {
      await OrdersAPI.update(order.id, { status: newStatus });
      await fetchOrders();
    } catch (e: any) {
      Alert.alert('Xato', e.message);
    } finally { setActionLoading(null); }
  };

  // Earnings
  const completed = orders.filter(o => o.status === OrderStatus.COMPLETED);
  const totalEarned = completed.reduce((sum, o) => sum + o.price * 0.9, 0);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mening ishlarim</Text>
        <View style={styles.earningBadge}>
          <Text style={styles.earningText}>{totalEarned.toLocaleString()} so'm</Text>
          <Text style={styles.earningLabel}>jami daromad</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1,2].map(i => <View key={i} style={[styles.card, { opacity: 0.4, height: 100 }]} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>{tab === 'COMPLETED' ? '✅' : '📋'}</Text>
          <Text style={styles.emptyTitle}>{tab === 'COMPLETED' ? 'Bajarilgan ish yo\'q' : 'Faol ish yo\'q'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={o => o.id}
          renderItem={({ item }) => (
            <JobCard order={item} onAction={() => handleAction(item)} actionLoading={actionLoading === item.id} />
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
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray[900] },
  earningBadge: { alignItems: 'flex-end' },
  earningText: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  earningLabel: { fontSize: 11, color: COLORS.gray[400] },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.gray[100] },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.gray[500] },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray[900], flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardLocation: { fontSize: 13, color: COLORS.gray[600], marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  actionBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray[600] },
});
