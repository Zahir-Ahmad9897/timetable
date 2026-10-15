import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { ColorValue, Platform, Pressable, useWindowDimensions } from 'react-native';
import { AuthGuard } from '../../src/auth';
import { usePreferences } from '../../src/state/PreferencesProvider';

const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: ColorValue; size: number }) =>
    <Ionicons name={name} color={color} size={size} />;

export default function TabLayout() {
  const router = useRouter();
  const { colorScheme } = usePreferences();
  const { width } = useWindowDimensions();
  const dark = colorScheme === 'dark';
  const desktop = Platform.OS === 'web' && width >= 1024;

  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitle: 'irid.ai Timetable',
          headerStyle: { backgroundColor: dark ? '#18181B' : '#FAFAFA' },
          headerTintColor: dark ? '#FAFAFA' : '#18181B',
          headerShadowVisible: false,
          sceneStyle: { backgroundColor: dark ? '#09090B' : '#FAFAFA' },
          tabBarActiveTintColor: dark ? '#A5B4FC' : '#4F46E5',
          tabBarInactiveTintColor: dark ? '#A1A1AA' : '#71717A',
          tabBarPosition: desktop ? 'left' : 'bottom',
          tabBarLabelPosition: desktop ? 'beside-icon' : 'below-icon',
          tabBarStyle: {
            backgroundColor: dark ? '#18181B' : '#FFFFFF',
            borderTopColor: dark ? '#3F3F46' : '#E4E4E7',
            borderRightColor: dark ? '#3F3F46' : '#E4E4E7',
            minHeight: desktop ? undefined : 64,
            width: desktop ? 224 : undefined,
            paddingTop: desktop ? 20 : undefined,
          },
          tabBarItemStyle: desktop ? { minHeight: 52, maxHeight: 52 } : undefined,
          tabBarLabelStyle: { fontSize: desktop ? 13 : 11, fontWeight: '600' },
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search all resources"
              hitSlop={10}
              onPress={() => router.push('/search')}
              style={{ padding: 12 }}
            >
              <Ionicons name="search" size={22} color={dark ? '#FAFAFA' : '#18181B'} />
            </Pressable>
          ),
        }}
      >
        <Tabs.Screen name="workspace" options={{ title: 'Workspace', tabBarIcon: icon('layers-outline') }} />
        <Tabs.Screen name="generate" options={{ title: 'Generate', tabBarIcon: icon('sparkles-outline') }} />
        <Tabs.Screen name="timetable" options={{ title: 'Timetable', tabBarIcon: icon('calendar-outline') }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline') }} />
      </Tabs>
    </AuthGuard>
  );
}
