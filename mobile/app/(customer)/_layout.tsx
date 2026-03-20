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

export default function CustomerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Bosh sahifa" focused={focused} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Buyurtmalar" focused={focused} /> }}
      />
      <Tabs.Screen
        name="create"
        options={{ tabBarIcon: ({ focused }) => (
          <View style={styles.createBtn}>
            <Text style={styles.createPlus}>+</Text>
          </View>
        )}}
      />
      <Tabs.Screen
        name="chats"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💬" label="Chatlar" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Profil" focused={focused} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.gray[100],
    height: 64, paddingBottom: 8, paddingTop: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  tabItem: { alignItems: 'center', gap: 2 },
  emoji: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: COLORS.gray[400], fontWeight: '500' },
  tabLabelActive: { color: COLORS.primary },
  createBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  createPlus: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: 32 },
});
