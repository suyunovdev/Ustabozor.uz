import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { ChatAPI, Message, MessageStatus, UsersAPI, User } from '../../services/api';
import { COLORS } from '../../constants';
import { SOCKET_URL } from '../../constants';
import { io, Socket } from 'socket.io-client';

export default function ChatScreen() {
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!chatId || !user) return;
    ChatAPI.getMessages(chatId).then(msgs => {
      setMessages(msgs);
      setLoading(false);
      ChatAPI.markAsRead(chatId, user.id).catch(() => {});
    }).catch(() => setLoading(false));
  }, [chatId, user?.id]);

  // Socket.IO
  useEffect(() => {
    if (!chatId || !user) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;
    socket.emit('user:online', { userId: user.id });
    socket.emit('chat:join', { chatId, userId: user.id });

    socket.on('message:new', (msg: Message) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      ChatAPI.markAsRead(chatId, user.id).catch(() => {});
    });

    socket.on('typing:update', ({ userId, isTyping: t }: any) => {
      if (userId !== user.id) setIsTyping(t);
    });

    return () => {
      socket.emit('chat:leave', { chatId, userId: user.id });
      socket.disconnect();
    };
  }, [chatId, user?.id]);

  // Load other user info from first message
  useEffect(() => {
    if (!messages.length || !user) return;
    const otherId = messages.find(m => m.senderId !== user.id)?.senderId;
    if (otherId && !otherUser) {
      UsersAPI.getById(otherId).then(setOtherUser).catch(() => {});
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !chatId || !user) return;
    const content = text.trim();
    setText('');
    setSending(true);

    // Optimistic
    const temp: Message = {
      id: `temp-${Date.now()}`, chatId, senderId: user.id,
      content, timestamp: new Date().toISOString(), status: MessageStatus.SENT,
    };
    setMessages(prev => [...prev, temp]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('message:send', { chatId, senderId: user.id, content });
      } else {
        const msg = await ChatAPI.sendMessage(chatId, user.id, content);
        setMessages(prev => prev.map(m => m.id === temp.id ? msg : m));
      }
    } catch {}
    finally { setSending(false); }
  };

  const handleTyping = (val: string) => {
    setText(val);
    socketRef.current?.emit('typing:start', { chatId, userId: user?.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing:stop', { chatId, userId: user?.id });
    }, 2000);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === user?.id;
    return (
      <View style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>
              {new Date(item.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isOwn && (
              <Text style={styles.statusIcon}>
                {item.status === MessageStatus.READ ? '✓✓' : item.status === MessageStatus.DELIVERED ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            {otherUser?.avatar
              ? <Image source={{ uri: otherUser.avatar }} style={styles.headerAvatarImg} />
              : <Text style={styles.headerAvatarLetter}>{otherUser?.name?.[0] || '?'}</Text>}
            {otherUser?.isOnline && <View style={styles.onlineDot} />}
          </View>
          <View>
            <Text style={styles.headerName}>{otherUser?.name} {otherUser?.surname}</Text>
            <Text style={styles.headerStatus}>
              {isTyping ? '✍️ yozmoqda...' : otherUser?.isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input */}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder="Xabar yozing..."
          value={text}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
          placeholderTextColor={COLORS.gray[400]}
        />
        <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={handleSend} disabled={!text.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendIcon}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F0F4FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.gray[100] },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: COLORS.primary },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { position: 'relative' },
  headerAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarLetter: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryLight, textAlign: 'center', lineHeight: 40, fontSize: 16, fontWeight: '700', color: COLORS.primary, overflow: 'hidden' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#fff' },
  headerName: { fontSize: 15, fontWeight: '700', color: COLORS.gray[900] },
  headerStatus: { fontSize: 12, color: COLORS.gray[400] },
  msgList: { padding: 16, gap: 4 },
  msgRow: { marginVertical: 2 },
  msgRowOwn: { alignItems: 'flex-end' },
  msgRowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleOwn: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 15, color: COLORS.gray[800], lineHeight: 21 },
  bubbleTextOwn: { color: '#fff' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 2 },
  bubbleTime: { fontSize: 11, color: COLORS.gray[400] },
  bubbleTimeOwn: { color: 'rgba(255,255,255,0.7)' },
  statusIcon: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 28, gap: 10, borderTopWidth: 1, borderTopColor: COLORS.gray[100] },
  input: { flex: 1, backgroundColor: COLORS.gray[50], borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 100, color: COLORS.gray[900], borderWidth: 1.5, borderColor: COLORS.gray[200] },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: COLORS.gray[300] },
  sendIcon: { fontSize: 18, color: '#fff' },
});
