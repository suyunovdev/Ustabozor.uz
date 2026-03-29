import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, Modal, TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, ChatAPI, Order, OrderStatus, UserRole } from '../../services/api';
import { COLORS } from '../../constants';

/* ─── STATUS CONFIG ─────────────────────────────────────────────────────── */
const STATUS: Record<string, { label: string; bg: string; color: string; bar: string }> = {
  PENDING:     { label: '⏳ Kutilmoqda',    bg: '#FFFBEB', color: '#D97706', bar: '#F59E0B' },
  ACCEPTED:    { label: '✅ Qabul qilindi', bg: '#EFF6FF', color: '#2563EB', bar: '#3B82F6' },
  IN_PROGRESS: { label: '⚙️ Jarayonda',     bg: '#FAF5FF', color: '#7C3AED', bar: '#8B5CF6' },
  COMPLETED:   { label: '🎉 Bajarildi',     bg: '#F0FDF4', color: '#16A34A', bar: '#22C55E' },
  CANCELLED:   { label: '❌ Bekor qilindi', bg: '#FFF1F2', color: '#DC2626', bar: '#EF4444' },
};

/* ─── TIMELINE ───────────────────────────────────────────────────────────── */
const Timeline = ({ order }: { order: Order }) => {
  const steps = [
    { label: 'Joylashtirildi', time: order.createdAt,   done: true },
    { label: 'Qabul qilindi',  time: order.acceptedAt,  done: !!order.acceptedAt },
    { label: 'Boshlandi',      time: order.startedAt,   done: !!order.startedAt },
    { label: 'Yakunlandi',     time: order.completedAt, done: !!order.completedAt },
  ];
  return (
    <View>
      {steps.map((s, i) => (
        <View key={i} style={tl.row}>
          <View style={tl.col}>
            <View style={[tl.dot, s.done && tl.dotDone]} />
            {i < steps.length - 1 && <View style={[tl.line, s.done && tl.lineDone]} />}
          </View>
          <View style={tl.body}>
            <Text style={[tl.label, s.done && tl.labelDone]}>{s.label}</Text>
            {s.time && <Text style={tl.time}>{new Date(s.time).toLocaleDateString('uz-UZ')}</Text>}
          </View>
        </View>
      ))}
    </View>
  );
};
const tl = StyleSheet.create({
  row:      { flexDirection: 'row', marginBottom: 4 },
  col:      { alignItems: 'center', width: 20, marginRight: 12 },
  dot:      { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E5E7EB', borderWidth: 2, borderColor: '#E5E7EB' },
  dotDone:  { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  line:     { width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 16 },
  lineDone: { backgroundColor: '#22C55E' },
  body:     { flex: 1, paddingBottom: 10 },
  label:    { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  labelDone:{ color: '#111827' },
  time:     { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
});

const safePrice = (p: any) => {
  const n = Number(p);
  return isNaN(n) || n > 100_000_000 || n < 0 ? 0 : n;
};

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [order, setOrder]           = useState<Order | null>(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  /* review modal */
  const [reviewModal, setReviewModal] = useState(false);
  const [rating, setRating]           = useState(0);
  const [comment, setComment]         = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const o = await OrdersAPI.getById(id);
      setOrder(o);
    } catch { Alert.alert('Xato', 'Buyurtma topilmadi'); router.back(); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (status: OrderStatus) => {
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await OrdersAPI.update(order.id, { status });
      setOrder(updated);
    } catch (e: any) { Alert.alert('Xato', e.message); }
    finally { setActionLoading(false); }
  };

  const handleChat = async () => {
    if (!order || !user) return;
    const otherId = user.role === UserRole.CUSTOMER ? order.workerId : order.customerId;
    if (!otherId) return;
    try {
      const chat = await ChatAPI.createOrGet(user.id, otherId);
      router.push(`/chat/${(chat as any)._id || (chat as any).id}` as any);
    } catch {}
  };

  const submitReview = async () => {
    if (!order || rating === 0) return;
    setSubmitting(true);
    try {
      await OrdersAPI.submitReview(order.id, rating, comment);
      setReviewModal(false);
      load();
    } catch (e: any) { Alert.alert('Xato', e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  );
  if (!order) return (
    <View style={styles.center}><Text>Buyurtma topilmadi</Text></View>
  );

  const isCustomer = user?.role === UserRole.CUSTOMER;
  const isWorker   = user?.role === UserRole.WORKER;
  const cfg        = STATUS[order.status] || STATUS.PENDING;
  const price      = safePrice(order.price);

  /* which action button */
  const actionBtn = (() => {
    if (isWorker) {
      if (order.status === OrderStatus.ACCEPTED)    return { label: '▶  Ishni boshlash', status: OrderStatus.IN_PROGRESS, color: '#7C3AED' };
      if (order.status === OrderStatus.IN_PROGRESS) return { label: '✅  Yakunlash',      status: OrderStatus.COMPLETED,   color: '#16A34A' };
    }
    if (isCustomer && order.status === OrderStatus.PENDING) {
      return { label: '❌  Bekor qilish', status: OrderStatus.CANCELLED, color: '#DC2626' };
    }
    return null;
  })();

  const canChat = order.workerId && ['ACCEPTED','IN_PROGRESS','COMPLETED'].includes(order.status);
  const canReview = isCustomer && order.status === OrderStatus.COMPLETED && !order.review;

  const otherUser = isCustomer ? order.worker : order.customer;

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{order.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STATUS BANNER ── */}
        <View style={[styles.statusBanner, { backgroundColor: cfg.bg, borderColor: cfg.bar + '40' }]}>
          <View style={[styles.statusBar, { backgroundColor: cfg.bar }]} />
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>

        {/* ── ORDER INFO ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>BUYURTMA MA'LUMOTLARI</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kategoriya</Text>
            <View style={styles.catBadge}>
              <Text style={styles.catBadgeText}>{order.category}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Narx</Text>
            <Text style={styles.infoPrice}>{price.toLocaleString()} so'm</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manzil</Text>
            <Text style={styles.infoValue}>📍 {order.location}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Sana</Text>
            <Text style={styles.infoValue}>{new Date(order.createdAt).toLocaleDateString('uz-UZ')}</Text>
          </View>
        </View>

        {/* ── DESCRIPTION ── */}
        {order.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>TAVSIF</Text>
            <Text style={styles.descText}>{order.description}</Text>
          </View>
        ) : null}

        {/* ── OTHER USER INFO ── */}
        {otherUser && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{isCustomer ? 'USTA' : 'MIJOZ'}</Text>
            <View style={styles.userRow}>
              {otherUser.avatar ? (
                <Image source={{ uri: otherUser.avatar }} style={styles.userAvatar} />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarFb]}>
                  <Text style={styles.userAvatarText}>{otherUser.name?.charAt(0)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{otherUser.name} {otherUser.surname ?? ''}</Text>
                {otherUser.rating != null && (
                  <Text style={styles.userRating}>⭐ {otherUser.rating?.toFixed(1)} • {otherUser.ratingCount ?? 0} baho</Text>
                )}
                {otherUser.phone && (
                  <Text style={styles.userPhone}>📞 {otherUser.phone}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── WORKER EARNINGS (if worker) ── */}
        {isWorker && order.status !== OrderStatus.CANCELLED && (
          <View style={styles.earningsCard}>
            <View style={styles.earningsRow}>
              <Text style={styles.earningsLabel}>Buyurtma narxi:</Text>
              <Text style={styles.earningsVal}>{price.toLocaleString()} so'm</Text>
            </View>
            <View style={styles.earningsRow}>
              <Text style={[styles.earningsLabel, { color: '#9CA3AF' }]}>Komissiya (10%):</Text>
              <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '600' }}>-{(price * 0.1).toLocaleString()} so'm</Text>
            </View>
            <View style={[styles.earningsRow, { borderTopWidth: 1.5, borderTopColor: '#BBF7D0', paddingTop: 8, marginTop: 4 }]}>
              <Text style={[styles.earningsLabel, { color: '#16A34A', fontWeight: '700' }]}>Sizning daromadingiz:</Text>
              <Text style={styles.earningsFinal}>{(price * 0.9).toLocaleString()} so'm</Text>
            </View>
          </View>
        )}

        {/* ── TIMELINE ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>JARAYON</Text>
          <Timeline order={order} />
        </View>

        {/* ── REVIEW (existing) ── */}
        {order.review && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>BAHO</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(i => (
                <Text key={i} style={[styles.star, i <= order.review!.rating && styles.starActive]}>★</Text>
              ))}
              <Text style={styles.ratingNum}>{order.review.rating}/5</Text>
            </View>
            {order.review.comment ? (
              <Text style={styles.reviewComment}>"{order.review.comment}"</Text>
            ) : null}
          </View>
        )}

        {/* ── REVIEW PROMPT ── */}
        {canReview && (
          <TouchableOpacity style={styles.reviewPromptBtn} onPress={() => setReviewModal(true)}>
            <Text style={styles.reviewPromptText}>⭐  Ustani baholang</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── STICKY ACTION BAR ── */}
      {(actionBtn || canChat) && (
        <View style={styles.actionBar}>
          {canChat && (
            <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
              <Text style={styles.chatBtnText}>💬</Text>
            </TouchableOpacity>
          )}
          {actionBtn && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: actionBtn.color }, actionLoading && { opacity: 0.7 }]}
              onPress={() => updateStatus(actionBtn.status)}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>{actionBtn.label}</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── REVIEW MODAL ── */}
      <Modal visible={reviewModal} transparent animationType="slide">
        <View style={rm.overlay}>
          <View style={rm.sheet}>
            <TouchableOpacity style={rm.close} onPress={() => setReviewModal(false)}>
              <Text style={rm.closeTxt}>✕</Text>
            </TouchableOpacity>
            <View style={rm.iconCircle}><Text style={{ fontSize: 32 }}>⭐</Text></View>
            <Text style={rm.title}>Xizmatni baholang</Text>
            <Text style={rm.sub}>Usta xizmati qanday bo'ldi?</Text>
            <View style={rm.starsRow}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRating(s)}>
                  <Text style={[rm.star, s <= rating && rm.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={rm.commentInput}
              placeholder="Izoh qoldiring..."
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[rm.submitBtn, (rating === 0 || submitting) && { opacity: 0.5 }]}
              onPress={submitReview}
              disabled={rating === 0 || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={rm.submitText}>Yuborish</Text>
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
  root:   { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 22, color: COLORS.primary },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', textAlign: 'center' },

  scroll: { padding: 16, gap: 12 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, overflow: 'hidden', paddingVertical: 12, paddingHorizontal: 14 },
  statusBar:    { width: 4, height: '100%', position: 'absolute', left: 0, top: 0, bottom: 0 },
  statusLabel:  { fontSize: 15, fontWeight: '700', marginLeft: 8 },

  card:         { backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 12 },

  infoRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  infoLabel:  { fontSize: 14, color: '#6B7280' },
  infoValue:  { fontSize: 14, fontWeight: '600', color: '#111827' },
  infoPrice:  { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  catBadge:   { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  descText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },

  userRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar:    { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#E5E7EB' },
  userAvatarFb:  { backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  userAvatarText:{ fontSize: 18, fontWeight: '700', color: COLORS.primary },
  userName:      { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  userRating:    { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  userPhone:     { fontSize: 12, color: '#6B7280' },

  earningsCard: { backgroundColor: '#F0FDF4', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' },
  earningsRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  earningsLabel:{ fontSize: 13, color: '#374151' },
  earningsVal:  { fontSize: 13, fontWeight: '600', color: '#111827' },
  earningsFinal:{ fontSize: 18, fontWeight: '800', color: '#16A34A' },

  starsRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  star:          { fontSize: 28, color: '#E5E7EB' },
  starActive:    { color: '#F59E0B' },
  ratingNum:     { fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 4 },
  reviewComment: { fontSize: 13, color: '#6B7280', fontStyle: 'italic' },

  reviewPromptBtn: { backgroundColor: '#F97316', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  reviewPromptText:{ fontSize: 15, fontWeight: '700', color: '#fff' },

  actionBar:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.97)', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 30, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  chatBtn:      { width: 50, height: 50, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#BFDBFE' },
  chatBtnText:  { fontSize: 20 },
  primaryBtn:   { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

const rm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  close:       { position: 'absolute', top: 16, right: 20, padding: 8 },
  closeTxt:    { fontSize: 18, color: '#9CA3AF' },
  iconCircle:  { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#FDE68A' },
  title:       { fontSize: 20, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  sub:         { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  starsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
  star:        { fontSize: 44, color: '#E5E7EB' },
  starActive:  { color: '#F59E0B' },
  commentInput:{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, fontSize: 14, color: '#111827', height: 90, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 16 },
  submitBtn:   { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  submitText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
