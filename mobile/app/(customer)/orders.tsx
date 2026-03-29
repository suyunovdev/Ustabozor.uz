import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator, Alert, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, ChatAPI, Order, OrderStatus, User } from '../../services/api';
import { COLORS } from '../../constants';

/* ─── STATUS CONFIG ─────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; color: string; barColor: string }> = {
  PENDING:     { label: '⏳ Kutilmoqda',    color: '#D97706', barColor: '#F59E0B' },
  ACCEPTED:    { label: '✅ Qabul qilindi', color: '#2563EB', barColor: '#3B82F6' },
  IN_PROGRESS: { label: '⚙️ Jarayonda',     color: '#7C3AED', barColor: '#8B5CF6' },
  COMPLETED:   { label: '🎉 Bajarildi',     color: '#059669', barColor: '#10B981' },
  CANCELLED:   { label: '❌ Bekor',          color: '#DC2626', barColor: '#EF4444' },
};

/* ─── ORDER TIMELINE ────────────────────────────────────────────────────── */
const OrderTimeline = ({ order }: { order: Order }) => {
  const steps = [
    { label: 'Joylashtirildi', time: order.createdAt,   done: true },
    { label: 'Qabul qilindi',  time: order.acceptedAt,  done: !!order.acceptedAt },
    { label: 'Boshlandi',      time: order.startedAt,   done: !!order.startedAt },
    { label: 'Bajarildi',      time: order.completedAt, done: !!order.completedAt },
  ];
  return (
    <View style={tl.wrap}>
      {steps.map((step, i) => (
        <View key={i} style={tl.row}>
          <View style={tl.dotWrap}>
            <View style={[tl.dot, step.done && tl.dotDone]} />
            {i < steps.length - 1 && <View style={[tl.line, step.done && tl.lineDone]} />}
          </View>
          <View style={tl.textWrap}>
            <Text style={[tl.label, step.done && tl.labelDone]}>{step.label}</Text>
            {step.time && (
              <Text style={tl.time}>{new Date(step.time).toLocaleDateString('uz-UZ')}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
};
const tl = StyleSheet.create({
  wrap:     { paddingVertical: 6 },
  row:      { flexDirection: 'row', marginBottom: 4 },
  dotWrap:  { alignItems: 'center', width: 20, marginRight: 10 },
  dot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#E5E7EB' },
  dotDone:  { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  line:     { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 14 },
  lineDone: { backgroundColor: '#22C55E' },
  textWrap: { flex: 1, paddingBottom: 8 },
  label:    { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  labelDone:{ color: '#111827' },
  time:     { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
});

/* ─── SKELETON ──────────────────────────────────────────────────────────── */
const SkeletonCard = () => (
  <View style={[styles.card, { opacity: 0.5, marginBottom: 14 }]}>
    <View style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 14 }} />
    <View style={{ height: 14, width: '60%', backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
    <View style={{ height: 10, width: '40%', backgroundColor: '#E5E7EB', borderRadius: 6, marginBottom: 8 }} />
    <View style={{ height: 10, width: '50%', backgroundColor: '#E5E7EB', borderRadius: 6 }} />
  </View>
);

/* ─── MAIN ──────────────────────────────────────────────────────────────── */
export default function MyOrders() {
  const { user } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* review modal */
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await OrdersAPI.getByCustomer(user!.id);
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

  /* stats */
  const activeOrders    = orders.filter(o => ['PENDING','ACCEPTED','IN_PROGRESS'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);
  const totalSpent      = completedOrders.reduce((s, o) => s + (o.price || 0), 0);

  const filtered =
    tab === 'ACTIVE'    ? activeOrders :
    tab === 'COMPLETED' ? completedOrders :
    orders;

  /* actions */
  const handleCancel = (orderId: string) => {
    Alert.alert('Bekor qilish', 'Buyurtmani bekor qilmoqchimisiz?', [
      { text: 'Yo\'q', style: 'cancel' },
      {
        text: 'Ha, bekor qilish', style: 'destructive',
        onPress: async () => {
          try {
            await OrdersAPI.cancel(orderId);
            load();
          } catch (e: any) { Alert.alert('Xato', e.message); }
        },
      },
    ]);
  };

  const openReview = (orderId: string) => {
    setReviewOrderId(orderId);
    setRating(0);
    setComment('');
    setReviewModal(true);
  };

  const submitReview = async () => {
    if (!reviewOrderId || rating === 0) return;
    setSubmitting(true);
    try {
      await OrdersAPI.submitReview(reviewOrderId, rating, comment);
      setReviewModal(false);
      load();
    } catch (e: any) { Alert.alert('Xato', e.message); }
    finally { setSubmitting(false); }
  };

  const handleChat = async (workerId: string) => {
    if (!user) return;
    try {
      const chat = await ChatAPI.createOrGet(user.id, workerId);
      router.push(`/chat/${(chat as any)._id || (chat as any).id}` as any);
    } catch { Alert.alert('Xato', 'Chat ochishda xatolik'); }
  };

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
          <Text style={styles.headerTitle}>Buyurtmalarim</Text>
          <Text style={styles.headerSub}>Barcha buyurtmalaringiz</Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{orders.length}</Text>
              <Text style={styles.statLabel}>Jami</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{activeOrders.length}</Text>
              <Text style={styles.statLabel}>Faol</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum} numberOfLines={1}>
                {totalSpent > 999999 ? (totalSpent / 1000000).toFixed(1) + 'M' : totalSpent.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Sarflangan</Text>
            </View>
          </View>
        </View>

        {/* ── TABS (floating card) ── */}
        <View style={styles.tabsWrap}>
          <View style={styles.tabsCard}>
            {(['ALL','ACTIVE','COMPLETED'] as const).map((t, i) => {
              const labels = ['Barchasi', `Faol (${activeOrders.length})`, 'Bajarilgan'];
              const colors = [COLORS.primary, '#3B82F6', '#22C55E'];
              const isActive = tab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, isActive && { backgroundColor: colors[i] }]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {labels[i]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── CONTENT ── */}
        <View style={styles.content}>
          {loading && [0,1,2].map(i => <SkeletonCard key={i} />)}

          {!loading && filtered.length === 0 && (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <Text style={styles.emptyIcon}>
                  {tab === 'COMPLETED' ? '✅' : tab === 'ACTIVE' ? '⏳' : '🛍'}
                </Text>
              </View>
              <Text style={styles.emptyTitle}>
                {tab === 'ALL' ? "Hali buyurtma yo'q" :
                 tab === 'ACTIVE' ? "Faol buyurtma yo'q" : "Bajarilgan ish yo'q"}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 'ALL' ? 'Birinchi buyurtmangizni bering va malakali usta toping' :
                 tab === 'ACTIVE' ? 'Yangi buyurtma bering — usta tez topiladi' :
                 'Ish bajarilgach, bu yerda ko\'rsatiladi'}
              </Text>
              {tab !== 'COMPLETED' && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => router.push('/(customer)/create')}
                >
                  <Text style={styles.emptyBtnText}>📦  Buyurtma berish</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!loading && filtered.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            const worker = order.worker;
            return (
              <View key={order.id} style={styles.card}>
                {/* top color bar */}
                <View style={[styles.colorBar, { backgroundColor: cfg.barColor }]} />

                <View style={styles.cardInner}>
                  {/* title + badge */}
                  <View style={styles.cardHead}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{order.title}</Text>
                      <Text style={styles.cardDate}>
                        📅 {new Date(order.createdAt).toLocaleDateString('uz-UZ')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '18' }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                  </View>

                  {/* description */}
                  {order.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>{order.description}</Text>
                  ) : null}

                  {/* location */}
                  <Text style={styles.cardLocation}>📍 {order.location}</Text>

                  {/* worker info */}
                  {worker && (
                    <View style={styles.workerRow}>
                      {worker.avatar ? (
                        <Image source={{ uri: worker.avatar }} style={styles.workerAvatar} />
                      ) : (
                        <View style={[styles.workerAvatar, styles.workerAvatarFb]}>
                          <Text style={styles.workerAvatarFbText}>{worker.name?.charAt(0)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.workerName}>{worker.name}</Text>
                        <Text style={styles.workerRating}>⭐ {worker.rating?.toFixed(1) || '5.0'}</Text>
                      </View>
                      <Text style={styles.workerTag}>Usta</Text>
                    </View>
                  )}

                  {/* price */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Narx:</Text>
                    <Text style={styles.priceVal}>{order.price.toLocaleString()} so'm</Text>
                  </View>

                  {/* timeline */}
                  <OrderTimeline order={order} />

                  {/* action buttons */}
                  <View style={styles.actionsWrap}>
                    {/* chat button */}
                    {order.workerId && ['ACCEPTED','IN_PROGRESS','COMPLETED'].includes(order.status) && (
                      <TouchableOpacity style={styles.chatBtn} onPress={() => handleChat(order.workerId!)}>
                        <Text style={styles.chatBtnText}>💬  Ishchi bilan bog'lanish</Text>
                      </TouchableOpacity>
                    )}

                    {/* cancel */}
                    {order.status === OrderStatus.PENDING && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(order.id)}>
                        <Text style={styles.cancelBtnText}>❌  Bekor qilish</Text>
                      </TouchableOpacity>
                    )}

                    {/* review */}
                    {order.status === OrderStatus.COMPLETED && !order.review && (
                      <TouchableOpacity style={styles.reviewBtn} onPress={() => openReview(order.id)}>
                        <Text style={styles.reviewBtnText}>⭐  Ustani baholang</Text>
                      </TouchableOpacity>
                    )}

                    {/* already reviewed */}
                    {order.review && (
                      <View style={styles.reviewedBadge}>
                        <Text style={styles.reviewedText}>
                          ✅ Baholandi — {order.review.rating}/5 ⭐
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── REVIEW MODAL ── */}
      <Modal visible={reviewModal} transparent animationType="slide">
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <TouchableOpacity style={modal.closeBtn} onPress={() => setReviewModal(false)}>
              <Text style={modal.closeTxt}>✕</Text>
            </TouchableOpacity>

            <View style={modal.starCircle}>
              <Text style={{ fontSize: 32 }}>⭐</Text>
            </View>
            <Text style={modal.title}>Xizmatni baholang</Text>
            <Text style={modal.sub}>Usta xizmati sizga ma'qul bo'ldimi?</Text>

            <View style={modal.starsRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={[modal.star, s <= rating && modal.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={modal.commentInput}
              placeholder="Izoh qoldiring..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[modal.submitBtn, (rating === 0 || submitting) && { opacity: 0.5 }]}
              onPress={submitReview}
              disabled={rating === 0 || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={modal.submitText}>Yuborish</Text>
              }
            </TouchableOpacity>
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
  header: {
    backgroundColor: '#F97316',
    paddingTop: 56, paddingHorizontal: 24, paddingBottom: 72,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 2 },
  headerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },
  statsRow:    { flexDirection: 'row', gap: 10 },
  statBox:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  statNum:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  /* floating tabs */
  tabsWrap:  { paddingHorizontal: 16, marginTop: -38 },
  tabsCard:  { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6 },
  tabBtn:    { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  tabText:   { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  tabTextActive: { color: '#fff' },

  /* content */
  content: { padding: 16, paddingTop: 16 },

  /* order card */
  card:      { backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  colorBar:  { height: 4 },
  cardInner: { padding: 16 },
  cardHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardDate:  { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  statusBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardDesc:  { fontSize: 13, color: '#6B7280', marginBottom: 8, lineHeight: 18 },
  cardLocation: { fontSize: 13, color: '#6B7280', marginBottom: 10 },

  /* worker row */
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderRadius: 14, padding: 12, marginBottom: 10 },
  workerAvatar: { width: 40, height: 40, borderRadius: 20 },
  workerAvatarFb: { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  workerAvatarFbText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  workerName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  workerRating: { fontSize: 12, color: '#6B7280' },
  workerTag:  { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  /* price */
  priceRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginBottom: 6 },
  priceLabel:{ fontSize: 13, color: '#6B7280' },
  priceVal:  { fontSize: 18, fontWeight: '800', color: COLORS.primary },

  /* actions */
  actionsWrap: { gap: 8, marginTop: 4 },
  chatBtn:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#BFDBFE', backgroundColor: '#fff' },
  chatBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  cancelBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FFF1F2' },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  reviewBtn: { paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: '#F97316', shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  reviewBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  reviewedBadge: { paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  reviewedText: { fontSize: 13, fontWeight: '700', color: '#16A34A' },

  /* empty */
  emptyWrap:   { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyIcon:   { fontSize: 36 },
  emptyTitle:  { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySub:    { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  emptyBtn:    { backgroundColor: '#F97316', borderRadius: 18, paddingHorizontal: 28, paddingVertical: 14, shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  emptyBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
});

/* ─── REVIEW MODAL STYLES ─────────────────────────────────────────────────── */
const modal = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  closeBtn:     { position: 'absolute', top: 16, right: 20, padding: 8 },
  closeTxt:     { fontSize: 18, color: '#9CA3AF' },
  starCircle:   { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF9C3', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#FDE68A' },
  title:        { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  sub:          { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  starsRow:     { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  star:         { fontSize: 42, color: '#E5E7EB' },
  starActive:   { color: '#F59E0B' },
  commentInput: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, fontSize: 14, color: '#111827', height: 90, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 16 },
  submitBtn:    { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
});
