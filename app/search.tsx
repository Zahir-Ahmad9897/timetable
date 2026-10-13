import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { EmptyState, PageIntro, SearchField, StatusPill } from '../src/components/ui';
import { useWorkspace } from '../src/state/WorkspaceProvider';
import { colors, radius, space, type } from '../src/theme';

const groups = [
  ['departments', 'Departments'], ['semesters', 'Semesters'], ['sections', 'Sections'], ['courses', 'Courses'], ['teachers', 'Teachers'], ['assignments', 'Assignments'], ['rooms', 'Rooms'],
] as const;

export default function GlobalSearchScreen() {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) return [];
    return groups.flatMap(([page, label]) => (workspace[page] as unknown as { id: string; [key: string]: unknown }[]).map((record) => {
      const searchable = Object.values(record).filter((value) => typeof value === 'string' || typeof value === 'number').join(' ').toLowerCase();
      return searchable.includes(normalized) ? { page, label, id: record.id, title: String(record.name || record.code || `${label.slice(0, -1)} record`), detail: searchable.slice(0, 120) } : null;
    }).filter((result): result is NonNullable<typeof result> => Boolean(result))).slice(0, 50);
  }, [query, workspace]);
  return <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled"><Pressable accessibilityRole="button" accessibilityLabel="Close search" onPress={() => router.back()} style={styles.back}><Ionicons name="close" size={24} color={colors.ink} /><Text style={styles.backText}>Close</Text></Pressable><PageIntro eyebrow="GLOBAL SEARCH" title="Find any resource" detail="Search human-readable fields across every workspace register." /><SearchField value={query} onChangeText={setQuery} placeholder="Search courses, teachers, rooms…" />{query.trim().length < 2 ? <EmptyState title="Type at least two characters" detail="Results stay on this device and open directly in the relevant resource editor." icon="search-outline" /> : results.length ? <View style={styles.list}>{results.map((result) => <Pressable key={`${result.page}-${result.id}`} accessibilityRole="button" accessibilityLabel={`Open ${result.title}`} onPress={() => router.push({ pathname: '/resource/[page]', params: { page: result.page, id: result.id } })} style={styles.result}><View style={styles.icon}><Ionicons name="search" size={16} color={colors.ink} /></View><View style={styles.flex}><Text style={styles.title}>{result.title}</Text><Text numberOfLines={1} style={styles.detail}>{result.detail}</Text></View><StatusPill label={result.label} /><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>)}</View> : <EmptyState title="No matching resources" detail="Try a course code, person, department, or room name." icon="search-outline" />}</ScrollView>;
}

const styles = StyleSheet.create({ page: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: space.md, gap: space.md, backgroundColor: colors.canvas }, back: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 }, backText: { color: colors.ink, ...type.label }, list: { gap: 8 }, result: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface }, icon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted }, flex: { flex: 1 }, title: { color: colors.ink, ...type.label }, detail: { color: colors.muted, ...type.caption, marginTop: 2 } });
