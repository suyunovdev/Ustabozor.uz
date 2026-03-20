import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { UsersAPI } from '../../services/api';
import { COLORS } from '../../constants';

export default function WorkerProfile() {
  const { user, logout, setUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const hasRating = user?.rating != null && user?.ratingCount && user.ratingCount > 0;

  const handleAvatarChange = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('avatar', { uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);
      const updated = await UsersAPI.updateProfile(user!.id, formData);
      setUser(updated);
    } catch (e: any) {
      Alert.alert('Xato', e.message);
    } finally { setUploading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Chiqish', 'Rostdan ham chiqmoqchimisiz?', [
      { text: 'Yo\'q', style: 'cancel' },
      { text: 'Ha', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <View style={styles.headerBg}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handleAvatarChange} disabled={uploading}>
          {user.avatar
            ? <Image source={{ uri: user.avatar }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{user.name[0]}</Text></View>}
          <View style={styles.editBadge}>
            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.editBadgeText}>✏️</Text>}
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user.name} {user.surname}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>🔧 Usta</Text>
        </View>
        {hasRating && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStar}>⭐</Text>
            <Text style={styles.ratingVal}>{user.rating?.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>({user.ratingCount} baho)</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user.completedJobs || 0}</Text>
          <Text style={styles.statLabel}>Bajarilgan</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{hasRating ? user.rating?.toFixed(1) : '—'}</Text>
          <Text style={styles.statLabel}>Reyting</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user.balance.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Balans</Text>
        </View>
      </View>

      {/* Skills */}
      {user.skills && user.skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ko'nikmalar</Text>
          <View style={styles.skillsWrap}>
            {user.skills.map(s => (
              <View key={s} style={styles.skillChip}>
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ma'lumotlar</Text>
        {[
          { label: '📱 Telefon', value: user.phone },
          { label: '💰 Soatlik narx', value: user.hourlyRate ? `${user.hourlyRate.toLocaleString()} so'm` : 'Ko\'rsatilmagan' },
          { label: '📅 Ro\'yxat sanasi', value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('uz-UZ') : '—' },
        ].map(row => (
          <View key={row.label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>🚪 Chiqish</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray[50] },
  scroll: { paddingBottom: 40 },
  headerBg: { backgroundColor: COLORS.primary, alignItems: 'center', paddingTop: 60, paddingBottom: 30 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarLetter: { fontSize: 36, fontWeight: '800', color: '#fff' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  editBadgeText: { fontSize: 13 },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8 },
  roleText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingStar: { fontSize: 16 },
  ratingVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  ratingCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  statsRow: { flexDirection: 'row', margin: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.gray[400], marginTop: 4 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray[900], marginBottom: 12 },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { backgroundColor: COLORS.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  skillText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.gray[50] },
  infoLabel: { fontSize: 14, color: COLORS.gray[500] },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.gray[800] },
  logoutBtn: { margin: 16, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
