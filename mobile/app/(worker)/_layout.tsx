import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function WorkerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" label="Ishlar" focused={focused} /> }} />
      <Tabs.Screen name="myjobs" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Mening ishlarim" focused={focused} /> }} />
      <Tabs.Screen name="chats" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Xabarlar" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.gray[100], height: 64, paddingBottom: 8, paddingTop: 6, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10 },
  tabItem: { alignItems: 'center', gap: 2 },
  emoji: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: COLORS.gray[400], fontWeight: '500' },
  tabLabelActive: { color: COLORS.primary },
});
