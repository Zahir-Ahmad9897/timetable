import 'react-native-gesture-handler';
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from '../src/components/feedback/AppErrorBoundary';
import { GlobalToast } from '../src/components/feedback/GlobalToast';
import { LoadingScreen } from '../src/components/feedback/LoadingScreen';
import { NotificationProvider } from '../src/state/NotificationProvider';
import { PreferencesProvider, usePreferences } from '../src/state/PreferencesProvider';
import { WorkspaceProvider, useWorkspace } from '../src/state/WorkspaceProvider';

function Navigator() {
  const { loading: preferencesLoading, colorScheme } = usePreferences();
  const { loading: workspaceLoading } = useWorkspace();
  if (preferencesLoading || workspaceLoading) return <LoadingScreen />;
  return <>
    <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="resource/[page]" />
      <Stack.Screen name="import-academic" />
      <Stack.Screen name="search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
    <GlobalToast />
  </>;
}

export default function RootLayout() {
  return <SafeAreaProvider><PreferencesProvider><NotificationProvider><WorkspaceProvider><AppErrorBoundary><Navigator /></AppErrorBoundary></WorkspaceProvider></NotificationProvider></PreferencesProvider></SafeAreaProvider>;
}
