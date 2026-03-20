import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { ChatAPI, Chat, UsersAPI, User } from '../../services/api';
import { COLORS } from '../../constants';

export default function ChatsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<(Chat & { otherUser?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChats = useCallback(async () => {
    try {
      const data = await ChatAPI.getChats(user!.id);
      // Har bir chat uchun boshqa foydalanuvchi ma'lumotlarini olish
      const enriched = await Promise.all(data.map(async (chat) => {
        const otherId = chat.participants.find(p => p !== user!.id);
        let otherUser: User | undefined;
        if (otherId) {
          try { otherUser = await UsersAPI.getById(otherId); } catch {}
        }
        return { ...chat, otherUser };
      }));
      setChats(enriched);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.id]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const renderItem = ({ item }: { item: Chat & { otherUser?: User } }) => {
    const other = item.otherUser;
    const lastMsg = (item as any).lastMessage;
    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => router.push(`/chat/${item.id}`)} activeOpacity={0.85}>
        <View style={styles.avatarWrap}>
          {other?.avatar
            ? <Image source={{ uri: other.avatar }} style={styles.avatar} />
            : <View style={styles.avatarFallback}><Text style={styles.avatarLetter}>{other?.name?.[0] || '?'}</Text></View>}
          {other?.isOnline && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.chatBody}>
          <View style={styles.chatTop}>
            <Text style={styles.chatName}>{other?.name} {other?.surname}</Text>
            {lastMsg && <Text style={styles.chatTime}>{new Date(lastMsg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</Text>}
          </View>
          <View style={styles.chatBottom}>
            <Text style={styles.lastMsg} numberOfLines={1}>
              {lastMsg?.content || 'Xabar yo\'q'}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Xabarlar</Text>
      </View>

      {loading ? (
        <View style={{ padding: 20 }}>
          {[1,2,3].map(i => (
            <View key={i} style={[styles.chatItem, { opacity: 0.4 }]}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.chatBody}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '60%' }]} />
              </View>
            </View>
          ))}
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Hali xabar yo'q</Text>
          <Text style={styles.emptyText}>Usta bilan bog'lanish uchun buyurtma bering</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChats(); }} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray[900] },
  chatItem: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray[50], alignItems: 'center' },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: COLORS.primary },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff' },
  chatBody: { flex: 1 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 15, fontWeight: '700', color: COLORS.gray[900] },
  chatTime: { fontSize: 11, color: COLORS.gray[400] },
  chatBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13, color: COLORS.gray[500], flex: 1 },
  badge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.gray[700], marginBottom: 6 },
  emptyText: { fontSize: 14, color: COLORS.gray[400], textAlign: 'center' },
  skeletonAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.gray[200] },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.gray[200], marginVertical: 4, width: '80%' },
});
