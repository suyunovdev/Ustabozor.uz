import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, Order, OrderStatus } from '../../services/api';
import { COLORS, CATEGORIES, ORDER_STATUS_COLORS } from '../../constants';

function JobCard({ order, onAccept, accepting }: { order: Order; onAccept: () => void; accepting: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{order.category}</Text>
        </View>
        <Text style={styles.cardPrice}>{order.price.toLocaleString()} so'm</Text>
      </View>
      <Text style={styles.cardTitle}>{order.title}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>{order.description}</Text>
      <Text style={styles.cardLocation}>📍 {order.location}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</Text>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} disabled={accepting}>
          {accepting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.acceptBtnText}>Qabul qilish</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, { opacity: 0.5 }]}>
      {[80, 60, 90, 40].map((w, i) => (
        <View key={i} style={[styles.skeletonLine, { width: `${w}%` }]} />
      ))}
    </View>
  );
}

export default function JobFeed() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtered, setFiltered] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCat, setSelectedCat] = useState('Hammasi');
  const [accepting, setAccepting] = useState<string | null>(null);

  const fetchOrders = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await OrdersAPI.getAvailableForWorker();
      setOrders(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchOrders(true); }, []);

  useEffect(() => {
    setFiltered(selectedCat === 'Hammasi' ? orders : orders.filter(o => o.category === selectedCat));
  }, [orders, selectedCat]);

  const handleAccept = async (order: Order) => {
    setAccepting(order.id);
    try {
      await OrdersAPI.update(order.id, { status: OrderStatus.ACCEPTED, workerId: user!.id });
      Alert.alert('Muvaffaqiyat', 'Buyurtma qabul qilindi!', [
        { text: 'Ko\'rish', onPress: () => router.push(`/order/${order.id}`) },
        { text: 'OK', onPress: () => fetchOrders() },
      ]);
    } catch (e: any) {
      Alert.alert('Xato', e.message || 'Qabul qilishda xatolik');
    } finally { setAccepting(null); }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mavjud ishlar</Text>
        <Text style={styles.headerSub}>{filtered.length} ta buyurtma</Text>
      </View>

      {/* Category filter */}
      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          data={['Hammasi', ...CATEGORIES]}
          keyExtractor={c => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, selectedCat === item && styles.filterChipActive]}
              onPress={() => setSelectedCat(item)}
            >
              <Text style={[styles.filterText, selectedCat === item && styles.filterTextActive]}>{item}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Buyurtma topilmadi</Text>
          <Text style={styles.emptyText}>Hozircha bu kategoriyada ish yo'q</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={o => o.id}
          renderItem={({ item }) => (
            <JobCard order={item} onAccept={() => handleAccept(item)} accepting={accepting === item.id} />
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
  header: { backgroundColor: COLORS.primary, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  filterList: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.gray[100] },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: COLORS.gray[600] },
  filterTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  cardPrice: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray[900], marginBottom: 6 },
  cardDesc: { fontSize: 13, color: COLORS.gray[500], marginBottom: 8, lineHeight: 18 },
  cardLocation: { fontSize: 13, color: COLORS.gray[600], marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontSize: 12, color: COLORS.gray[400] },
  acceptBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 100, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[700] },
  emptyText: { fontSize: 14, color: COLORS.gray[400], marginTop: 4, textAlign: 'center' },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.gray[200], marginVertical: 5 },
});
