import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, ChatAPI, Order, OrderStatus } from '../../services/api';
import { COLORS } from '../../constants';

/* ─── ORDER TIMELINE ─────────────────────────────────────────────────────── */
const OrderTimeline = ({ order }: { order: Order }) => {
  const steps = [
    { label: 'Joylashtirildi', time: order.createdAt,   done: true },
    { label: 'Qabul qilindi',  time: order.acceptedAt,  done: !!order.acceptedAt },
    { label: 'Boshlandi',      time: order.startedAt,   done: !!order.startedAt },
    { label: 'Bajarildi',      time: order.completedAt, done: !!order.completedAt },
  ];
  return (
    <View style={tl.wrap}>
      {steps.map((s, i) => (
        <View key={i} style={tl.row}>
          <View style={tl.dotCol}>
            <View style={[tl.dot, s.done && tl.dotDone]} />
            {i < steps.length - 1 && <View style={[tl.line, s.done && tl.lineDone]} />}
          </View>
          <View style={tl.info}>
            <Text style={[tl.label, s.done && tl.labelDone]}>{s.label}</Text>
            {s.time && <Text style={tl.time}>{new Date(s.time).toLocaleDateString('uz-UZ')}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
};
const tl = StyleSheet.create({
  wrap:    { paddingVertical: 4 },
  row:     { flexDirection: 'row', marginBottom: 2 },
  dotCol:  { alignItems: 'center', width: 18, marginRight: 10 },
  dot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#E5E7EB' },
  dotDone: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  line:    { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 14 },
  lineDone:{ backgroundColor: '#22C55E' },
  info:    { flex: 1, paddingBottom: 8 },
  label:   { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  labelDone: { color: '#111827' },
  time:    { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
});

/* ─── SKELETON ───────────────────────────────────────────────────────────── */
const Skeleton = () => (
  <View style={[styles.card, { opacity: 0.5 }]}>
    <View style={[styles.leftBar, { backgroundColor: '#E2E8F0' }]} />
    <View style={{ flex: 1, padding: 14 }}>
      <View style={{ width: '65%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 6, marginBottom: 8 }} />
      <View style={{ width: '40%', height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, marginBottom: 12 }} />
      <View style={{ height: 60, backgroundColor: '#E2E8F0', borderRadius: 12, marginBottom: 10 }} />
      <View style={{ height: 70, backgroundColor: '#E2E8F0', borderRadius: 12 }} />
    </View>
  </View>
);

/* ─── STAT CARD ─────────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, bg }: { icon: string; label: string; value: string; bg: string }) => (
  <View style={[sc.card, { borderColor: bg + '40' }]}>
    <View style={[sc.iconWrap, { backgroundColor: bg }]}>
      <Text style={sc.icon}>{icon}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={sc.label}>{label}</Text>
      <Text style={sc.value}>{value}</Text>
    </View>
  </View>
);
const sc = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 10 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon:     { fontSize: 20 },
  label:    { fontSize: 11, color: '#6B7280', marginBottom: 2 },
  value:    { fontSize: 18, fontWeight: '800', color: '#111827' },
});

/* ─── LEFT BAR COLORS ────────────────────────────────────────────────────── */
const barColor = (status: OrderStatus) => {
  if (status === OrderStatus.IN_PROGRESS) return '#8B5CF6';
  if (status === OrderStatus.ACCEPTED)    return '#3B82F6';
  if (status === OrderStatus.COMPLETED)   return '#22C55E';
  return '#9CA3AF';
};
const statusLabel = (status: OrderStatus) => {
  if (status === OrderStatus.IN_PROGRESS) return { text: '⚙️ Jarayonda', bg: '#EDE9FE', color: '#7C3AED' };
  if (status === OrderStatus.ACCEPTED)    return { text: '✅ Qabul qilindi', bg: '#DBEAFE', color: '#1D4ED8' };
  if (status === OrderStatus.COMPLETED)   return { text: '🎉 Bajarildi', bg: '#DCFCE7', color: '#15803D' };
  if (status === OrderStatus.CANCELLED)   return { text: '❌ Bekor', bg: '#FEE2E2', color: '#DC2626' };
  return { text: status, bg: '#F3F4F6', color: '#6B7280' };
};

/* ─── SAFE PRICE ─────────────────────────────────────────────────────────── */
const safePrice = (p: any) => {
  const n = Number(p);
  return isNaN(n) || n > 100_000_000 || n < 0 ? 0 : n;
};

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
export default function MyJobs() {
  const { user } = useAuth();
  const router = useRouter();

  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]           = useState<'ACTIVE' | 'HISTORY' | 'EARNINGS'>('ACTIVE');
  const [processing, setProcessing] = useState<string | null>(null);

  /* confirm complete modal */
  const [confirmModal, setConfirmModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await OrdersAPI.getByWorker(user!.id);
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => {
    load(true);
    pollRef.current = setInterval(() => load(), 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  /* filter */
  const activeOrders  = orders.filter(o => [OrderStatus.ACCEPTED, OrderStatus.IN_PROGRESS].includes(o.status));
  const historyOrders = orders.filter(o => [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(o.status));
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);

  const totalEarnings = completedOrders.reduce((s, o) => s + safePrice(o.price) * 0.9, 0);
  const pendingEarnings = activeOrders.reduce((s, o) => s + safePrice(o.price) * 0.9, 0);
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);
  const monthEarnings = completedOrders
    .filter(o => new Date(o.createdAt) >= thisMonth)
    .reduce((s, o) => s + safePrice(o.price) * 0.9, 0);

  /* start job */
  const handleStart = async (orderId: string) => {
    setProcessing(orderId);
    try {
      await OrdersAPI.update(orderId, { status: OrderStatus.IN_PROGRESS });
      load();
    } catch (e: any) { Alert.alert('Xato', e.message); }
    finally { setProcessing(null); }
  };

  /* complete job — show confirm modal */
  const handleComplete = (order: Order) => {
    setSelectedOrder(order);
    setConfirmModal(true);
  };

  const confirmComplete = async () => {
    if (!selectedOrder) return;
    setProcessing(selectedOrder.id);
    setConfirmModal(false);
    try {
      await OrdersAPI.update(selectedOrder.id, { status: OrderStatus.COMPLETED });
      load();
      setTab('EARNINGS');
    } catch (e: any) { Alert.alert('Xato', e.message); }
    finally { setProcessing(null); setSelectedOrder(null); }
  };

  /* chat */
  const handleChat = async (customerId: string) => {
    if (!user) return;
    try {
      const chat = await ChatAPI.createOrGet(user.id, customerId);
      router.push(`/chat/${(chat as any)._id || (chat as any).id}` as any);
    } catch { Alert.alert('Xato', 'Chat ochishda xatolik'); }
  };

  const displayOrders = tab === 'ACTIVE' ? activeOrders : historyOrders;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#fff" />
        }
      >
        {/* ── GRADIENT HEADER ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mening Ishlarim</Text>
          <Text style={styles.headerSub}>Buyurtmalar va daromadingiz</Text>
          <View style={styles.headerStats}>
            <View style={styles.headerStatBox}>
              <View style={styles.headerStatRow}>
                <Text style={styles.headerStatIcon}>💰</Text>
                <Text style={styles.headerStatLabel}>Jami daromad</Text>
              </View>
              <Text style={styles.headerStatVal}>
                {totalEarnings > 0 ? totalEarnings.toLocaleString() + ' so\'m' : '—'}
              </Text>
            </View>
            <View style={styles.headerStatBox}>
              <View style={styles.headerStatRow}>
                <Text style={styles.headerStatIcon}>⏳</Text>
                <Text style={styles.headerStatLabel}>Kutilmoqda</Text>
              </View>
              <Text style={styles.headerStatVal}>
                {pendingEarnings > 0 ? pendingEarnings.toLocaleString() + ' so\'m' : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── FLOATING TABS ── */}
        <View style={styles.tabsWrap}>
          <View style={styles.tabsCard}>
            {([
              { key: 'ACTIVE',   label: `⚡ Faol (${activeOrders.length})`,   activeColor: '#3B82F6' },
              { key: 'HISTORY',  label: `✅ Tarix (${historyOrders.length})`,  activeColor: '#3B82F6' },
              { key: 'EARNINGS', label: '💵 Daromad',                          activeColor: '#22C55E' },
            ] as const).map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabBtn, tab === t.key && { backgroundColor: t.activeColor }]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CONTENT ── */}
        <View style={styles.content}>
          {/* loading */}
          {loading && [0,1,2].map(i => <Skeleton key={i} />)}

          {/* ──── EARNINGS TAB ──── */}
          {!loading && tab === 'EARNINGS' && (
            <>
              <StatCard icon="💰" label="Jami daromad"     value={totalEarnings.toLocaleString() + ' so\'m'}     bg="#10B981" />
              <StatCard icon="📅" label="Bu oy"            value={monthEarnings.toLocaleString() + ' so\'m'}     bg="#3B82F6" />
              <StatCard icon="💼" label="Bajarilgan ishlar" value={String(completedOrders.length) + ' ta'}       bg="#8B5CF6" />
              <StatCard icon="⭐" label="Reyting"           value={(user?.rating?.toFixed(1) ?? '—') + '/5'}     bg="#F59E0B" />

              {/* earnings history */}
              <View style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>📈 Daromad tarixi</Text>
                </View>
                {completedOrders.length === 0 ? (
                  <View style={styles.historyEmpty}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>💸</Text>
                    <Text style={styles.historyEmptyText}>Hali daromad yo'q</Text>
                    <Text style={styles.historyEmptySubText}>Ishlarni bajaring va pul ishlang!</Text>
                  </View>
                ) : completedOrders.map(o => (
                  <View key={o.id} style={styles.historyRow}>
                    <View style={styles.historyIconWrap}>
                      <Text style={{ fontSize: 18 }}>✅</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyRowTitle} numberOfLines={1}>{o.title}</Text>
                      <Text style={styles.historyRowDate}>{new Date(o.createdAt).toLocaleDateString('uz-UZ')}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.historyEarning}>+{(safePrice(o.price) * 0.9).toLocaleString()}</Text>
                      <Text style={styles.historyEarningSub}>so'm</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.walletBtn}
                onPress={() => router.push('/(worker)/profile')}
              >
                <Text style={styles.walletBtnText}>💳  Hamyonga o'tish  →</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ──── ACTIVE / HISTORY TABS ──── */}
          {!loading && tab !== 'EARNINGS' && displayOrders.length === 0 && (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <Text style={{ fontSize: 36 }}>{tab === 'ACTIVE' ? '💼' : '📋'}</Text>
              </View>
              <Text style={styles.emptyTitle}>
                {tab === 'ACTIVE' ? "Faol ish yo'q" : "Ish tarixi bo'sh"}
              </Text>
              {tab === 'ACTIVE' && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(worker)')}
                >
                  <Text style={styles.emptyBtnText}>🔍  Yangi ish qidirish</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!loading && tab !== 'EARNINGS' && displayOrders.map(order => {
            const bar  = barColor(order.status);
            const badge = statusLabel(order.status);
            return (
              <View key={order.id} style={styles.card}>
                <View style={[styles.leftBar, { backgroundColor: bar }]} />
                <View style={styles.cardBody}>
                  {/* title + badge */}
                  <View style={styles.cardHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{order.title}</Text>
                      <Text style={styles.cardId}>#{order.id.slice(0, 8)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusText, { color: badge.color }]}>{badge.text}</Text>
                    </View>
                  </View>

                  {/* customer */}
                  {order.customer && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>👤 {order.customer.name} {order.customer.surname ?? ''}</Text>
                    </View>
                  )}
                  {order.customer?.phone && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>📞 +998 {order.customer.phone}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>📍 {order.location}</Text>
                  </View>

                  {/* description */}
                  {order.description ? (
                    <View style={styles.descBlock}>
                      <Text style={styles.descText}>"{order.description}"</Text>
                    </View>
                  ) : null}

                  {/* price breakdown */}
                  <View style={styles.priceBlock}>
                    <View style={styles.priceRow}>
                      <Text style={styles.priceRowLabel}>Buyurtma narxi:</Text>
                      <Text style={styles.priceRowVal}>{safePrice(order.price).toLocaleString()} so'm</Text>
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceRowLabel, { color: '#9CA3AF' }]}>Komissiya (10%):</Text>
                      <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>
                        -{(safePrice(order.price) * 0.1).toLocaleString()} so'm
                      </Text>
                    </View>
                    <View style={[styles.priceRow, { borderTopWidth: 1.5, borderTopColor: '#BBF7D0', paddingTop: 8, marginTop: 4 }]}>
                      <Text style={[styles.priceRowLabel, { color: '#16A34A', fontWeight: '700' }]}>Sizning daromadingiz:</Text>
                      <Text style={styles.priceEarning}>{(safePrice(order.price) * 0.9).toLocaleString()} so'm</Text>
                    </View>
                  </View>

                  {/* timeline */}
                  <OrderTimeline order={order} />

                  {/* action buttons */}
                  {tab === 'ACTIVE' && (
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.chatBtn} onPress={() => order.customerId && handleChat(order.customerId)}>
                        <Text style={styles.chatBtnText}>💬  Mijoz bilan bog'lanish</Text>
                      </TouchableOpacity>
                      <View style={styles.actionRow}>
                        {order.status === OrderStatus.ACCEPTED && (
                          <TouchableOpacity
                            style={[styles.startBtn, processing === order.id && { opacity: 0.6 }]}
                            onPress={() => handleStart(order.id)}
                            disabled={processing === order.id}
                          >
                            {processing === order.id
                              ? <ActivityIndicator color="#fff" size="small" />
                              : <Text style={styles.startBtnText}>▶  Boshlash</Text>
                            }
                          </TouchableOpacity>
                        )}
                        {order.status === OrderStatus.IN_PROGRESS && (
                          <TouchableOpacity
                            style={[styles.completeBtn, processing === order.id && { opacity: 0.6 }]}
                            onPress={() => handleComplete(order)}
                            disabled={processing === order.id}
                          >
                            {processing === order.id
                              ? <ActivityIndicator color="#fff" size="small" />
                              : <Text style={styles.completeBtnText}>✅  Tugatish va to'lov olish</Text>
                            }
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {tab === 'HISTORY' && order.status === OrderStatus.COMPLETED && (
                    <TouchableOpacity style={styles.chatBtn} onPress={() => order.customerId && handleChat(order.customerId)}>
                      <Text style={styles.chatBtnText}>💬  Mijoz bilan bog'lanish</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          <View style={{ height: 20 }} />
        </View>
      </ScrollView>

      {/* ── CONFIRM COMPLETE MODAL ── */}
      <Modal visible={confirmModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.iconWrap}>
              <Text style={{ fontSize: 40 }}>💰</Text>
            </View>
            <Text style={modal.title}>Ishni yakunlash</Text>
            <Text style={modal.sub}>Ishni tugatganingizni tasdiqlaysizmi?</Text>

            {selectedOrder && (
              <View style={modal.summaryBox}>
                <Text style={modal.summaryTitle}>{selectedOrder.title}</Text>
                <View style={modal.summaryRow}>
                  <Text style={modal.summaryLabel}>Buyurtma narxi:</Text>
                  <Text style={modal.summaryVal}>{safePrice(selectedOrder.price).toLocaleString()} so'm</Text>
                </View>
                <View style={modal.summaryRow}>
                  <Text style={[modal.summaryLabel, { color: '#9CA3AF' }]}>Komissiya (10%):</Text>
                  <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>
                    -{(safePrice(selectedOrder.price) * 0.1).toLocaleString()} so'm
                  </Text>
                </View>
                <View style={[modal.summaryRow, { borderTopWidth: 2, borderTopColor: '#22C55E', paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[modal.summaryLabel, { color: '#16A34A', fontWeight: '700' }]}>Siz olasiz:</Text>
                  <Text style={modal.summaryEarning}>
                    {(safePrice(selectedOrder.price) * 0.9).toLocaleString()} so'm
                  </Text>
                </View>
              </View>
            )}

            <View style={modal.btns}>
              <TouchableOpacity style={modal.cancelBtn} onPress={() => setConfirmModal(false)}>
                <Text style={modal.cancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.confirmBtn} onPress={confirmComplete}>
                <Text style={modal.confirmText}>✅  Tasdiqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },

  /* header */
  header:         { backgroundColor: '#4F46E5', paddingTop: 56, paddingHorizontal: 24, paddingBottom: 70 },
  headerTitle:    { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub:      { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 18 },
  headerStats:    { flexDirection: 'row', gap: 10 },
  headerStatBox:  { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  headerStatRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  headerStatIcon: { fontSize: 14 },
  headerStatLabel:{ fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  headerStatVal:  { fontSize: 17, fontWeight: '800', color: '#fff' },

  /* floating tabs */
  tabsWrap: { paddingHorizontal: 16, marginTop: -44 },
  tabsCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  tabBtn:   { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  tabText:  { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  tabTextActive: { color: '#fff' },

  /* content */
  content: { padding: 14, paddingTop: 16 },

  /* job card */
  card:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  leftBar:  { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle:{ fontSize: 16, fontWeight: '700', color: '#111827', lineHeight: 21 },
  cardId:   { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  statusText:  { fontSize: 10, fontWeight: '700' },

  /* meta rows */
  metaRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { fontSize: 13, color: '#4B5563' },

  /* description */
  descBlock: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, marginVertical: 10 },
  descText:  { fontSize: 13, color: '#6B7280', fontStyle: 'italic', lineHeight: 18 },

  /* price breakdown */
  priceBlock: { backgroundColor: '#F0FDF4', borderRadius: 14, padding: 12, marginVertical: 10, borderWidth: 1, borderColor: '#BBF7D0' },
  priceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  priceRowLabel: { fontSize: 13, color: '#374151' },
  priceRowVal:   { fontSize: 13, fontWeight: '600', color: '#111827' },
  priceEarning:  { fontSize: 18, fontWeight: '800', color: '#16A34A' },

  /* action buttons */
  actions:     { gap: 8, marginTop: 8 },
  actionRow:   { gap: 8 },
  chatBtn:     { paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#BFDBFE', backgroundColor: '#fff', alignItems: 'center' },
  chatBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  startBtn:    { paddingVertical: 13, borderRadius: 14, backgroundColor: '#7C3AED', alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  startBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  completeBtn: { paddingVertical: 13, borderRadius: 14, backgroundColor: '#16A34A', alignItems: 'center', shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  completeBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* empty */
  emptyWrap:   { alignItems: 'center', paddingVertical: 48 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 12 },
  emptyBtn:    { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },

  /* earnings */
  historyCard:      { backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  historyHeader:    { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyTitle:     { fontSize: 15, fontWeight: '700', color: '#111827' },
  historyEmpty:     { alignItems: 'center', padding: 28 },
  historyEmptyText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  historyEmptySubText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  historyRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyIconWrap:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  historyRowTitle:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  historyRowDate:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  historyEarning:   { fontSize: 15, fontWeight: '800', color: '#16A34A' },
  historyEarningSub:{ fontSize: 10, color: '#9CA3AF' },

  walletBtn:     { backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 10, shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  walletBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

/* ─── MODAL STYLES ─────────────────────────────────────────────────────── */
const modal = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  iconWrap:    { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#86EFAC' },
  title:       { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  sub:         { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 18 },
  summaryBox:  { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginBottom: 20 },
  summaryTitle:{ fontSize: 14, color: '#6B7280', marginBottom: 10 },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryLabel:{ fontSize: 13, color: '#374151' },
  summaryVal:  { fontSize: 13, fontWeight: '600', color: '#111827' },
  summaryEarning: { fontSize: 22, fontWeight: '800', color: '#16A34A' },
  btns:        { flexDirection: 'row', gap: 10 },
  cancelBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText:  { fontSize: 14, fontWeight: '700', color: '#374151' },
  confirmBtn:  { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#16A34A', alignItems: 'center', shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
