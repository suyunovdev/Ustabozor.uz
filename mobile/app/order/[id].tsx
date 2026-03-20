import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { OrdersAPI, Order, OrderStatus, UserRole, ChatAPI } from '../../services/api';
import { COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../constants';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    OrdersAPI.getById(id).then(o => { setOrder(o); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  const handleAction = async (status: OrderStatus) => {
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await OrdersAPI.update(order.id, { status });
      setOrder(updated);
    } catch (e: any) {
      Alert.alert('Xato', e.message);
    } finally { setActionLoading(false); }
  };

  const handleChat = async () => {
    if (!order || !user) return;
    const otherId = user.role === UserRole.CUSTOMER ? order.workerId : order.customerId;
    if (!otherId) return;
    try {
      const chat = await ChatAPI.createOrGet(user.id, otherId);
      router.push(`/chat/${chat.id}`);
    } catch {}
  };

  const handleReview = async (rating: number) => {
    if (!order) return;
    const updated = await OrdersAPI.update(order.id, { review: { rating, comment: '', createdAt: new Date().toISOString() } });
    setOrder(updated);
    Alert.alert('Rahmat!', 'Bahoyingiz qabul qilindi');
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
  );
  if (!order) return (
    <View style={styles.center}><Text>Buyurtma topilmadi</Text></View>
  );

  const isCustomer = user?.role === UserRole.CUSTOMER;
  const isWorker = user?.role === UserRole.WORKER;
  const color = ORDER_STATUS_COLORS[order.status] || COLORS.gray[400];

  // Primary action button
  const getPrimaryAction = () => {
    if (isWorker) {
      if (order.status === OrderStatus.ACCEPTED) return { label: 'Ishni boshlash', status: OrderStatus.IN_PROGRESS, color: COLORS.secondary };
      if (order.status === OrderStatus.IN_PROGRESS) return { label: 'Tugatish', status: OrderStatus.COMPLETED, color: COLORS.primary };
    }
    if (isCustomer) {
      if (order.status === OrderStatus.PENDING) return { label: 'Bekor qilish', status: OrderStatus.CANCELLED, color: '#EF4444' };
    }
    return null;
  };
  const action = getPrimaryAction();
  const canChat = [OrderStatus.ACCEPTED, OrderStatus.IN_PROGRESS].includes(order.status as OrderStatus);
  const canReview = isCustomer && order.status === OrderStatus.COMPLETED && !order.review;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{order.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status */}
        <View style={[styles.statusBanner, { backgroundColor: color + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusLabel, { color }]}>{ORDER_STATUS_LABELS[order.status]}</Text>
        </View>

        {/* Main info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Buyurtma ma'lumotlari</Text>
          {[
            { label: 'Kategoriya', value: order.category },
            { label: 'Narx', value: `${order.price.toLocaleString()} so'm` },
            { label: 'Manzil', value: order.location },
            { label: 'Sana', value: new Date(order.createdAt).toLocaleDateString('uz-UZ') },
          ].map(row => (
            <View key={row.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tavsif</Text>
          <Text style={styles.descText}>{order.description}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Jarayon</Text>
          {[
            { label: 'Joylashtirildi', time: order.createdAt, done: true },
            { label: 'Qabul qilindi', time: order.acceptedAt, done: !!order.acceptedAt },
            { label: 'Boshlandi', time: order.startedAt, done: !!order.startedAt },
            { label: 'Tugatildi', time: order.completedAt, done: !!order.completedAt },
          ].map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: step.done ? COLORS.primary : COLORS.gray[200] }]} />
              <View style={styles.timelineBody}>
                <Text style={[styles.timelineLabel, !step.done && styles.timelineLabelDim]}>{step.label}</Text>
                {step.time && <Text style={styles.timelineTime}>{new Date(step.time).toLocaleDateString('uz-UZ')}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Review */}
        {order.review && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Baho</Text>
            <View style={styles.reviewRow}>
              {[1,2,3,4,5].map(i => (
                <Text key={i} style={{ fontSize: 22 }}>{i <= order.review!.rating ? '⭐' : '☆'}</Text>
              ))}
            </View>
            {order.review.comment ? <Text style={styles.reviewComment}>{order.review.comment}</Text> : null}
          </View>
        )}

        {canReview && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Usta bahosi</Text>
            <View style={styles.reviewRow}>
              {[1,2,3,4,5].map(i => (
                <TouchableOpacity key={i} onPress={() => handleReview(i)}>
                  <Text style={{ fontSize: 32 }}>⭐</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky action bar */}
      {(action || canChat) && (
        <View style={styles.actionBar}>
          {canChat && (
            <TouchableOpacity style={styles.chatBtn} onPress={handleChat}>
              <Text style={styles.chatBtnText}>💬 Chat</Text>
            </TouchableOpacity>
          )}
          {action && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: action.color, flex: canChat ? 1 : undefined, minWidth: canChat ? undefined : 200 }]}
              onPress={() => handleAction(action.status)}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{action.label}</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray[50] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: COLORS.primary },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.gray[900], textAlign: 'center' },
  scroll: { padding: 16, gap: 12 },
  statusBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.gray[500], marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.gray[50] },
  infoLabel: { fontSize: 14, color: COLORS.gray[500] },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.gray[800] },
  descText: { fontSize: 14, color: COLORS.gray[700], lineHeight: 22 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  timelineBody: { flex: 1 },
  timelineLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray[800] },
  timelineLabelDim: { color: COLORS.gray[400] },
  timelineTime: { fontSize: 12, color: COLORS.gray[400], marginTop: 2 },
  reviewRow: { flexDirection: 'row', gap: 4 },
  reviewComment: { fontSize: 14, color: COLORS.gray[600], marginTop: 8, fontStyle: 'italic' },
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.gray[100] },
  chatBtn: { backgroundColor: COLORS.gray[100], borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  chatBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.gray[700] },
  primaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
