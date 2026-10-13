import React from 'react';
import { Linking, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Banner, Button, Card, PageIntro, StatusPill } from '../../components/ui';
import { ThemePreference } from '../../storage/preferenceTypes';
import { usePreferences } from '../../state/PreferencesProvider';
import { useWorkspace } from '../../state/WorkspaceProvider';
import { colors, space, type } from '../../theme';

export default function SettingsScreen() {
  const { preferences, colorScheme, setPreference } = usePreferences();
  const { dataSource, dirty, importJson, exportJson, restoreSource } = useWorkspace();
  const version = Constants.expoConfig?.version || '1.0.0';
  const themes: { value: ThemePreference; label: string }[] = [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }];
  return <ScrollView contentContainerStyle={styles.page}>
    <PageIntro eyebrow="APP PREFERENCES" title="Settings" detail="Control appearance, feedback, local data, privacy information, and release details." />
    <Card><View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Appearance</Text><StatusPill label={`${colorScheme} active`} tone="info" /></View><Text style={styles.detail}>Follow the device or choose a fixed theme.</Text><View style={styles.row}>{themes.map((theme) => <Button key={theme.value} label={theme.label} variant={preferences.theme === theme.value ? 'primary' : 'secondary'} onPress={() => { void setPreference('theme', theme.value); }} />)}</View></Card>
    <Card><View style={styles.switchRow}><View style={styles.flex}><Text accessibilityRole="header" style={styles.title}>Haptic feedback</Text><Text style={styles.detail}>Use subtle tactile confirmation for supported native controls. Browsers may ignore haptics.</Text></View><Switch accessibilityLabel="Haptic feedback" value={preferences.hapticsEnabled} onValueChange={(value) => { void setPreference('hapticsEnabled', value); }} /></View></Card>
    <Card><View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>Local data management</Text><StatusPill label={dirty ? 'Unsaved' : 'Saved'} tone={dirty ? 'warning' : 'success'} /></View><Text style={styles.detail}>Active source: {dataSource === 'organization' ? 'UET Mardan organization data' : 'Manual workspace'}. Export a backup before clearing data.</Text><View style={styles.actions}><Button label="Import JSON" icon="download-outline" variant="secondary" onPress={() => { void importJson(); }} /><Button label="Export JSON" icon="share-outline" variant="secondary" onPress={() => { void exportJson(); }} /></View><Button label={dataSource === 'organization' ? 'Restore bundled data' : 'Clear manual data'} icon="trash-outline" variant="danger" onPress={restoreSource} /></Card>
    <Card><Text accessibilityRole="header" style={styles.title}>Privacy</Text><Banner type="success" text="No analytics or remote timetable API is enabled. Workspace data stays in private device storage or this browser profile unless you export it." /><Text style={styles.detail}>Images and biometric data are not used by this standalone timetable app. Clearing app or browser site data can remove local records.</Text></Card>
    <Card><View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>What’s new</Text><StatusPill label={`Version ${version}`} /></View><Text style={styles.detail}>Deep-linkable navigation, first-run guidance, theme and haptic preferences, global search, graceful recovery, undo notifications, and improved loading states.</Text><Button label="Contact support" icon="mail-outline" variant="quiet" onPress={() => { void Linking.openURL('mailto:support@irid.ai?subject=Timetable%20feedback'); }} /></Card>
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: space.md, paddingBottom: 112, gap: space.md, backgroundColor: colors.canvas }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { color: colors.ink, ...type.title }, detail: { color: colors.muted, ...type.body }, flex: { flex: 1 }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 } });

