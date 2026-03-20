import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { UsersAPI, User } from '../../services/api';
import { COLORS } from '../../constants';

function WorkerCard({ worker, onPress }: { worker: User; onPress: () => void }) {
  const hasRating = worker.rating != null && worker.ratingCount && worker.ratingCount > 0;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardLeft}>
        {worker.avatar
          ? <Image source={{ uri: worker.avatar }} style={styles.avatar} />
          : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{worker.name[0]}</Text></View>}
        <View style={[styles.onlineDot, { backgroundColor: worker.isOnline ? '#10B981' : COLORS.gray[300] }]} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.workerName}>{worker.name} {worker.surname}</Text>
        <Text style={styles.workerSkills} numberOfLines={1}>
          {worker.skills?.join(', ') || 'Ko\'nikmalar ko\'rsatilmagan'}
        </Text>
        <View style={styles.cardRow}>
          <View style={styles.ratingRow}>
            {hasRating ? (
              <>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.ratingText}>{worker.rating?.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({worker.ratingCount} baho)</Text>
              </>
            ) : (
              <Text style={styles.noRating}>Baholanmagan</Text>
            )}
          </View>
          {worker.hourlyRate ? (
            <Text style={styles.rate}>{worker.hourlyRate.toLocaleString()} so'm/soat</Text>
          ) : null}
        </View>
        <View style={styles.jobsRow}>
          <Text style={styles.jobs}>✅ {worker.completedJobs || 0} ta ish bajarildi</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.cardBody}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
        <View style={[styles.skeletonLine, { width: '40%' }]} />
      </View>
    </View>
  );
}

export default function CustomerHome() {
  const { user } = useAuth();
  const router = useRouter();
  const [workers, setWorkers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkers = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const data = await UsersAPI.getWorkers();
      setWorkers(data);
      setFiltered(data);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchWorkers(true); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(workers); return; }
    const q = search.toLowerCase();
    setFiltered(workers.filter(w =>
      `${w.name} ${w.surname}`.toLowerCase().includes(q) ||
      w.skills?.some(s => s.toLowerCase().includes(q))
    ));
  }, [search, workers]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Salom, {user?.name}! 👋</Text>
          <Text style={styles.subtext}>Qaysi ustani qidiryapsiz?</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(customer)/profile')}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarLetter}>{user?.name?.[0] || 'U'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Usta ismi yoki ko'nikma..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={COLORS.gray[400]}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.list}>
          {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>Usta topilmadi</Text>
          <Text style={styles.emptyText}>"{search}" bo'yicha natija yo'q</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={w => w.id}
          renderItem={({ item }) => (
            <WorkerCard worker={item} onPress={() => router.push(`/order/new?workerId=${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWorkers(); }} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gray[50] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.primary, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20 },
  greeting: { fontSize: 20, fontWeight: '800', color: '#fff' },
  subtext: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerAvatarLetter: { fontSize: 18, fontWeight: '700', color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.gray[200] },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12, color: COLORS.gray[900] },
  clearBtn: { padding: 4 },
  clearText: { fontSize: 20, color: COLORS.gray[400] },
  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardLeft: { position: 'relative', marginRight: 14 },
  avatar: { width: 58, height: 58, borderRadius: 16 },
  avatarFallback: { width: 58, height: 58, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#fff' },
  cardBody: { flex: 1 },
  workerName: { fontSize: 15, fontWeight: '700', color: COLORS.gray[900] },
  workerSkills: { fontSize: 12, color: COLORS.gray[500], marginTop: 2 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { fontSize: 12 },
  ratingText: { fontSize: 13, fontWeight: '700', color: COLORS.gray[800] },
  ratingCount: { fontSize: 11, color: COLORS.gray[400] },
  noRating: { fontSize: 12, color: COLORS.gray[400], fontStyle: 'italic' },
  rate: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  jobsRow: { marginTop: 4 },
  jobs: { fontSize: 11, color: COLORS.gray[400] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[700] },
  emptyText: { fontSize: 14, color: COLORS.gray[400], marginTop: 4, textAlign: 'center' },
  skeleton: { opacity: 0.6 },
  skeletonAvatar: { width: 58, height: 58, borderRadius: 16, backgroundColor: COLORS.gray[200] },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.gray[200], marginVertical: 4, width: '80%' },
});
