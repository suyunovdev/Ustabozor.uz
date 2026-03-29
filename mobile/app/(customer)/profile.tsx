import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator, Modal, Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { UsersAPI, OrdersAPI } from '../../services/api';
import EditProfileModal from '../../components/EditProfileModal';

/* ─── Weighted profile completion (matches web) ──────────────────────────── */
const calcCompletion = (user: any) => {
  const fields = [
    { filled: !!user.name,                                                    w: 15 },
    { filled: !!user.surname,                                                 w: 10 },
    { filled: !!user.phone,                                                   w: 15 },
    { filled: !!user.email,                                                   w: 15 },
    { filled: !!(user.avatar && user.avatar.startsWith('http')),              w: 20 },
    { filled: (user.rating || 0) > 0 && (user.ratingCount || 0) > 0,         w: 10 },
    { filled: true /* customer: no skills required */,                        w: 10 },
    { filled: true,                                                           w:  5 },
  ];
  return fields.reduce((s, f) => s + (f.filled ? f.w : 0), 0);
};

const progressColor = (pct: number, colors: any) =>
  pct >= 90 ? '#10B981' : pct >= 60 ? colors.primary : '#F59E0B';

/* ─── MAIN ───────────────────────────────────────────────────────────────── */
export default function CustomerProfile() {
  const { user, logout, setUser } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();

  const [uploading, setUploading]       = useState(false);
  const [logoutModal, setLogoutModal]   = useState(false);
  const [editModal, setEditModal]       = useState(false);
  const [totalOrders, setTotalOrders]   = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    OrdersAPI.getByCustomer(user.id).then((list: any[]) => setTotalOrders(list.length)).catch(() => {});
  }, [user?.id]);

  if (!user) return null;

  const completion  = calcCompletion(user);
  const pctColor    = progressColor(completion, colors);
  const joinYear    = user.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear();
  const ordersCount = totalOrders ?? user.completedJobs ?? 0;

  const achievements = [
    { icon: '👤', label: "A'zo",          earned: true,                              color: colors.primary,  bg: colors.primaryLight },
    { icon: '✅', label: "To'liq profil",  earned: completion >= 90,                  color: '#10B981',       bg: '#ECFDF5' },
    { icon: '⭐', label: '5 Yulduz',       earned: (user.rating ?? 0) >= 4.5,         color: '#F59E0B',       bg: '#FFFBEB' },
    { icon: '📦', label: '10+ buyurtma',   earned: ordersCount >= 10,                 color: '#8B5CF6',       bg: '#F5F3FF' },
  ];

  const handleAvatarChange = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', { uri: result.assets[0].uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      const updated = await UsersAPI.updateProfile(user.id, fd);
      setUser(updated);
    } catch (e: any) { Alert.alert('Xato', e.message); }
    finally { setUploading(false); }
  };

  const s = makeStyles(colors);

  /* ── Menu sections ── */
  const menuSections = [
    {
      title: 'Profil',
      items: [
        { icon: '✏️', label: 'Shaxsiy ma\'lumotlar', sub: 'Tahrirlash',    action: () => setEditModal(true) },
        { icon: '🔔', label: 'Bildirishnomalar',      sub: 'Ko\'rish',      action: () => {} },
        { icon: '📍', label: 'Manzilim',              sub: 'O\'zgartirish', action: () => {} },
      ],
    },
    {
      title: 'Moliya',
      items: [
        { icon: '💳', label: 'Hamyon',    sub: `${(user.balance ?? 0).toLocaleString()} so'm`, action: () => {} },
      ],
    },
    {
      title: 'Ilova',
      items: [
        { icon: isDark ? '🌙' : '☀️', label: isDark ? 'Tungi rejim' : 'Kunduzgi rejim', sub: 'toggle', action: toggleTheme },
      ],
    },
  ];

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── GRADIENT HEADER ── */}
        <View style={s.headerBg}>
          {/* decorative blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />

          {/* avatar */}
          <TouchableOpacity style={s.avatarWrap} onPress={handleAvatarChange} disabled={uploading}>
            {user.avatar
              ? <Image source={{ uri: user.avatar }} style={s.avatar} />
              : <View style={s.avatarFb}><Text style={s.avatarFbText}>{user.name?.charAt(0) ?? 'U'}</Text></View>
            }
            <View style={s.editBadge}>
              {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.editBadgeText}>📷</Text>}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── FLOATING PROFILE CARD ── */}
        <View style={s.floatCardWrap}>
          <View style={[s.floatCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* name row */}
            <View style={s.nameRow}>
              <Text style={[s.name, { color: colors.text }]}>{user.name} {user.surname ?? ''}</Text>
              <Text style={{ fontSize: 18 }}>✅</Text>
            </View>

            {/* badges */}
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[s.badgeTxt, { color: colors.primary }]}>👤 Buyurtmachi</Text>
              </View>
              <View style={[s.badge, { backgroundColor: '#FFFBEB' }]}>
                <Text style={[s.badgeTxt, { color: '#92400E' }]}>⭐ {user.rating?.toFixed(1) ?? '5.0'}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[s.badgeTxt, { color: colors.textSub }]}>📅 {joinYear}</Text>
              </View>
            </View>

            {/* completion bar */}
            <View style={s.completionWrap}>
              <View style={s.completionHead}>
                <Text style={[s.completionLbl, { color: colors.textMuted }]}>PROFIL TO'LDIRILGANLIGI</Text>
                <Text style={[s.completionPct, { color: pctColor }]}>{completion}%</Text>
              </View>
              <View style={[s.progressBg, { backgroundColor: colors.border }]}>
                <View style={[s.progressFill, { width: `${completion}%` as any, backgroundColor: pctColor }]} />
              </View>
            </View>
          </View>
        </View>

        {/* ── STAT CARDS ── */}
        <View style={s.statsCol}>
          <StatCard icon="💳" label="Hamyon" value={`${(user.balance ?? 0).toLocaleString()}`} sub="Kartalar va operatsiyalar" color="#10B981" colors={colors} onPress={() => {}} />
          <StatCard icon="⭐" label="Reyting" value={user.rating?.toFixed(1) ?? '5.0'} sub={`${user.ratingCount ?? 0} ta baho`} color="#F59E0B" colors={colors} />
          <StatCard icon="💼" label="Buyurtmalar" value={String(ordersCount)} sub="Jami buyurtmalar soni" color={colors.primary} colors={colors} onPress={() => {}} />
        </View>

        {/* ── PLATFORM BANNER ── */}
        <View style={s.bannerWrap}>
          <View style={s.banner}>
            <View style={s.bannerBlob} />
            <View style={s.bannerRow}>
              <View style={s.bannerIcon}><Text style={{ fontSize: 22 }}>📈</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerSub}>PLATFORMA STATISTIKASI</Text>
                <Text style={s.bannerTitle}>Ustabozor.uz platformasiga xush kelibsiz 🚀</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── ACHIEVEMENTS ── */}
        <View style={s.sectionWrap}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>🏆 Yutuqlar</Text>
            <Text style={[s.sectionSub, { color: colors.primary }]}>
              {achievements.filter(a => a.earned).length}/{achievements.length}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.achieveScroll}>
            {achievements.map((a, i) => (
              <View key={i} style={[s.achieveItem, !a.earned && s.achieveDim]}>
                <View style={[s.achieveCircle, { backgroundColor: a.bg }]}>
                  <Text style={{ fontSize: 24 }}>{a.icon}</Text>
                  {a.earned && (
                    <View style={s.achieveTick}><Text style={{ fontSize: 8, color: '#fff' }}>✓</Text></View>
                  )}
                </View>
                <Text style={[s.achieveLabel, { color: colors.textSub }]}>{a.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── INFO ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Ma'lumotlar</Text>
          {[
            { icon: '📱', label: 'Telefon',    value: user.phone },
            { icon: '📧', label: 'Email',      value: user.email ?? 'Ko\'rsatilmagan' },
            { icon: '📅', label: 'A\'zo bo\'ldi', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('uz-UZ') : '—' },
          ].map(row => (
            <View key={row.label} style={[s.infoRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[s.infoLbl, { color: colors.textSub }]}>{row.icon} {row.label}</Text>
              <Text style={[s.infoVal, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── MENU SECTIONS ── */}
        {menuSections.map(section => (
          <View key={section.title} style={s.menuSection}>
            <Text style={[s.menuSectionTitle, { color: colors.textMuted }]}>{section.title.toUpperCase()}</Text>
            <View style={[s.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.menuRow, i < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}
                  onPress={item.action}
                >
                  <View style={[s.menuIconWrap, { backgroundColor: colors.surfaceAlt }]}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.menuLbl, { color: colors.text }]}>{item.label}</Text>
                    {item.sub && item.sub !== 'toggle' && (
                      <Text style={[s.menuSub, { color: colors.textMuted }]}>{item.sub}</Text>
                    )}
                  </View>
                  {item.sub === 'toggle'
                    ? <ThemeToggle isDark={isDark} colors={colors} />
                    : <Text style={[s.menuArrow, { color: colors.border }]}>›</Text>
                  }
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* ── LOGOUT ── */}
        <View style={{ marginHorizontal: 16, marginTop: 4, marginBottom: 8 }}>
          <TouchableOpacity style={[s.logoutBtn, { backgroundColor: colors.redLight, borderColor: colors.redBorder }]} onPress={() => setLogoutModal(true)}>
            <Text style={[s.logoutTxt, { color: colors.red }]}>🚪  Chiqish</Text>
          </TouchableOpacity>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer}>
          <View style={s.socials}>
            <TouchableOpacity onPress={() => Linking.openURL('https://t.me/ustabozor')}><Text style={s.socialIcon}>✈️</Text></TouchableOpacity>
            <TouchableOpacity><Text style={s.socialIcon}>📸</Text></TouchableOpacity>
            <TouchableOpacity><Text style={s.socialIcon}>🌐</Text></TouchableOpacity>
          </View>
          <Text style={[s.footerTxt, { color: colors.textMuted }]}>Ustabozor.uz Platformasi</Text>
          <Text style={[s.footerVer, { color: colors.border }]}>v1.3.0 • Build {new Date().getFullYear()}</Text>
        </View>

        <View style={{ height: 40 }} />

        {/* ── LOGOUT MODAL ── */}
        <Modal visible={logoutModal} transparent animationType="fade">
          <View style={[lm.overlay, { backgroundColor: colors.overlay }]}>
            <View style={[lm.box, { backgroundColor: colors.surface }]}>
              <View style={[lm.iconWrap, { backgroundColor: colors.redLight }]}>
                <Text style={{ fontSize: 32 }}>🚪</Text>
              </View>
              <Text style={[lm.title, { color: colors.text }]}>Chiqish</Text>
              <Text style={[lm.sub, { color: colors.textSub }]}>
                Haqiqatan ham hisobingizdan chiqmoqchimisiz? Keyingi safar kirish uchun parolingiz kerak bo'ladi.
              </Text>
              <View style={lm.btns}>
                <TouchableOpacity style={[lm.cancel, { backgroundColor: colors.surfaceAlt }]} onPress={() => setLogoutModal(false)}>
                  <Text style={[lm.cancelTxt, { color: colors.textSub }]}>Bekor qilish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={lm.confirm} onPress={() => { setLogoutModal(false); logout(); }}>
                  <Text style={lm.confirmTxt}>Ha, chiqish</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModal}
        onClose={() => setEditModal(false)}
        user={user}
        onSave={setUser}
      />
    </View>
  );
}

/* ── ThemeToggle ── */
function ThemeToggle({ isDark, colors }: { isDark: boolean; colors: any }) {
  return (
    <View style={[tt.track, { backgroundColor: isDark ? colors.primary : colors.border }]}>
      <View style={[tt.thumb, isDark && tt.thumbOn]}>
        <Text style={{ fontSize: 10 }}>{isDark ? '🌙' : '☀️'}</Text>
      </View>
    </View>
  );
}
const tt = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },
  thumbOn: { alignSelf: 'flex-end' },
});

/* ── StatCard ── */
function StatCard({ icon, label, value, sub, color, colors, onPress }: any) {
  const bg = color === '#10B981' ? '#ECFDF5' : color === '#F59E0B' ? '#FFFBEB' : colors.primaryLight;
  return (
    <TouchableOpacity
      style={[sc.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[sc.iconWrap, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
          <Text style={[sc.value, { color: colors.text }]}>{value}</Text>
          {label === 'Reyting' && <Text style={{ fontSize: 14 }}>⭐</Text>}
        </View>
        <Text style={[sc.label, { color: colors.textSub }]}>{label}</Text>
        {sub && <Text style={[sc.sub, { color: colors.textMuted }]}>{sub}</Text>}
      </View>
      {onPress && <Text style={[sc.arrow, { color: colors.border }]}>›</Text>}
    </TouchableOpacity>
  );
}
const sc = StyleSheet.create({
  card:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  value:    { fontSize: 22, fontWeight: '900' },
  label:    { fontSize: 13, fontWeight: '600', marginTop: 1 },
  sub:      { fontSize: 11, marginTop: 1 },
  arrow:    { fontSize: 24 },
});

const makeStyles = (c: any) => StyleSheet.create({
  root: { flex: 1 },

  headerBg:      { height: 200, backgroundColor: '#2563EB', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  blob1:         { position: 'absolute', top: -40, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.08)' },
  blob2:         { position: 'absolute', bottom: -60, right: -30, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(139,92,246,0.15)' },
  avatarWrap:    { position: 'relative' },
  avatar:        { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  avatarFb:      { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' },
  avatarFbText:  { fontSize: 40, fontWeight: '800', color: '#fff' },
  editBadge:     { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#1D4ED8', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  editBadgeText: { fontSize: 15 },

  floatCardWrap: { paddingHorizontal: 20, marginTop: -28 },
  floatCard:     { borderRadius: 24, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  nameRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  name:          { fontSize: 22, fontWeight: '900', flex: 1 },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge:         { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeTxt:      { fontSize: 12, fontWeight: '700' },
  completionWrap:{ marginTop: 4 },
  completionHead:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  completionLbl: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  completionPct: { fontSize: 10, fontWeight: '800' },
  progressBg:    { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 4 },

  statsCol:  { paddingHorizontal: 16, marginTop: 16 },

  bannerWrap: { paddingHorizontal: 16, marginBottom: 16 },
  banner:     { borderRadius: 20, padding: 16, overflow: 'hidden', backgroundColor: '#6366F1' },
  bannerBlob: { position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)' },
  bannerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  bannerSub:  { fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  bannerTitle:{ fontSize: 13, color: '#fff', fontWeight: '700' },

  sectionWrap:  { paddingHorizontal: 16, marginBottom: 16 },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800' },
  sectionSub:   { fontSize: 12, fontWeight: '700' },
  achieveScroll:{ gap: 16, paddingBottom: 4 },
  achieveItem:  { alignItems: 'center', gap: 6, width: 72 },
  achieveDim:   { opacity: 0.35 },
  achieveCircle:{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  achieveTick:  { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  achieveLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  card:      { marginHorizontal: 16, marginBottom: 12, borderRadius: 18, padding: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  infoLbl:   { fontSize: 13 },
  infoVal:   { fontSize: 13, fontWeight: '600' },

  menuSection:      { paddingHorizontal: 16, marginBottom: 8 },
  menuSectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  menuCard:         { borderRadius: 18, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  menuRow:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIconWrap:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLbl:          { fontSize: 15, fontWeight: '600' },
  menuSub:          { fontSize: 11, marginTop: 1 },
  menuArrow:        { fontSize: 22, fontWeight: '300' },

  logoutBtn: { borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1 },
  logoutTxt: { fontSize: 15, fontWeight: '800' },

  footer:    { alignItems: 'center', paddingVertical: 20 },
  socials:   { flexDirection: 'row', gap: 20, marginBottom: 10 },
  socialIcon:{ fontSize: 22 },
  footerTxt: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  footerVer: { fontSize: 10 },
});

const lm = StyleSheet.create({
  overlay:    { flex: 1, justifyContent: 'center', padding: 32 },
  box:        { borderRadius: 28, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 },
  iconWrap:   { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:      { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  sub:        { fontSize: 13, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  btns:       { flexDirection: 'row', gap: 12, width: '100%' },
  cancel:     { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  cancelTxt:  { fontSize: 14, fontWeight: '700' },
  confirm:    { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#DC2626', alignItems: 'center', shadowColor: '#DC2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  confirmTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
