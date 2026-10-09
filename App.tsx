import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useApp } from './src/context/AppContext';
import SetupScreen from './src/screens/SetupScreen';
import GenerateScreen from './src/screens/GenerateScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import { colors, radius, type } from './src/theme';

type Tab = 'setup' | 'generate' | 'timetable';
const tabs: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'setup', label: 'Workspace', icon: 'layers-outline' },
  { id: 'generate', label: 'Generate', icon: 'sparkles-outline' },
  { id: 'timetable', label: 'Timetable', icon: 'calendar-outline' },
];

function Shell() {
  const { loading } = useApp();
  const [history, setHistory] = useState<Tab[]>(['setup']);
  const tab = history[history.length - 1]!;
  const navigate = (next: Tab) => setHistory((current) => current[current.length - 1] === next ? current : [...current, next]);
  const goBack = () => setHistory((current) => current.length > 1 ? current.slice(0, -1) : current);
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (history.length <= 1) return false; goBack(); return true; }); return () => listener.remove(); }, [history.length]);

  if (loading) return <View style={styles.loading}><View style={styles.loadingMark}><Ionicons name="calendar" size={28} color={colors.primary} /></View><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.loadingText}>Loading your local workspace…</Text><Text style={styles.loadingDetail}>No network connection is required.</Text></View>;
  const previous = history.length > 1 ? tabs.find((item) => item.id === history[history.length - 2]) : null;

  return <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
    <View style={styles.appBar}><View style={styles.brandMark}><Ionicons name="grid" size={19} color={colors.white} /></View><View style={{ flex: 1 }}><Text style={styles.brand}>irid.ai Timetable</Text><Text style={styles.brandDetail}>Local academic planning</Text></View><View style={styles.offlinePill}><View style={styles.offlineDot} /><Text style={styles.offlineText}>Offline</Text></View></View>
    {previous ? <Pressable accessibilityRole="button" accessibilityLabel={`Back to ${previous.label}`} onPress={goBack} style={styles.backBar}><Ionicons name="arrow-back" size={20} color={colors.primary} /><Text style={styles.backBarText}>Back to {previous.label}</Text></Pressable> : null}
    <View style={styles.content}>{tab === 'setup' ? <SetupScreen /> : tab === 'generate' ? <GenerateScreen onOpenTimetable={() => navigate('timetable')} /> : <TimetableScreen onGenerate={() => navigate('generate')} />}</View>
    <View accessibilityRole="tablist" style={styles.nav}>{tabs.map((item) => { const active = item.id === tab; return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => navigate(item.id)} style={styles.navItem}><Ionicons name={active ? item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap : item.icon} size={22} color={active ? colors.primary : colors.muted} /><Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>{active ? <View style={styles.activeMark} /> : null}</Pressable>; })}</View>
  </SafeAreaView>;
}

export default function App() { return <SafeAreaProvider><StatusBar style="dark" /><AppProvider><Shell /></AppProvider></SafeAreaProvider>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingMark: { width: 64, height: 64, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  loadingText: { color: colors.ink, ...type.title },
  loadingDetail: { color: colors.muted, ...type.body },
  appBar: { minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.canvas, borderBottomWidth: 1, borderBottomColor: colors.line },
  brandMark: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  brand: { color: colors.ink, ...type.label },
  brandDetail: { color: colors.muted, ...type.caption },
  offlinePill: { height: 28, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  offlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.muted },
  offlineText: { color: colors.ink, ...type.caption },
  backBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, backgroundColor: colors.canvas, borderBottomWidth: 1, borderBottomColor: colors.line },
  backBarText: { color: colors.muted, ...type.label },
  nav: { position: 'absolute', bottom: 24, alignSelf: 'center', height: 64, flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.line, ...Platform.select({ ios: { shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 }, android: { elevation: 4 } }) },
  navItem: { width: 80, height: 64, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  navLabel: { color: colors.muted, ...type.caption, fontSize: 10, marginTop: 2, opacity: 0 },
  navLabelActive: { color: colors.ink, opacity: 1 },
  activeMark: { position: 'absolute', top: 8, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceMuted, zIndex: -1 },
});
