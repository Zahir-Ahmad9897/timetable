import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, type } from '../../theme';

export function EmptyState({ title, detail, icon = 'file-tray-outline' }: { title: string; detail: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return <View style={styles.emptyState}><View style={styles.emptyIcon}><Ionicons name={icon} size={22} color={colors.muted} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>;
}

const styles = StyleSheet.create({
  emptyState: { minHeight: 160, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', padding: 24, backgroundColor: colors.surface }, emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, emptyTitle: { color: colors.ink, ...type.label, textAlign: 'center' }, emptyDetail: { color: colors.muted, ...type.caption, textAlign: 'center', marginTop: 4 },
});
