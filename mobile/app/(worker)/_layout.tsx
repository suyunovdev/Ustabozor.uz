import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useUnreadCount } from '../../hooks/useUnreadCount';

const ACTIVE = '#4F46E5';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color: focused ? ACTIVE : colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function ChatTabIcon({ focused }: { focused: boolean }) {
  const { colors } = useTheme();
  const unread = useUnreadCount();
  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <Text style={styles.emoji}>💬</Text>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, { color: focused ? ACTIVE : colors.textMuted }]}>Xabarlar</Text>
    </View>
  );
}

export default function WorkerLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBorder,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index"   options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Ishlar" focused={focused} /> }} />
      <Tabs.Screen name="myjobs"  options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Mening ishlarim" focused={focused} /> }} />
      <Tabs.Screen name="chats"   options={{ tabBarIcon: ({ focused }) => <ChatTabIcon focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem:   { alignItems: 'center', gap: 2 },
  iconWrap:  { position: 'relative' },
  emoji:     { fontSize: 22 },
  tabLabel:  { fontSize: 10, fontWeight: '500' },
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 2, borderColor: '#fff',
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
