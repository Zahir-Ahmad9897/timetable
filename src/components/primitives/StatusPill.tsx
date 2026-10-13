import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, type } from '../../theme';

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <View style={[styles.statusPill, styles[`statusPill_${tone}`]]}><Text style={[styles.statusPillText, styles[`statusPillText_${tone}`]]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  statusPill: { minHeight: 24, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: radius.sm, paddingHorizontal: 8, borderWidth: 1 }, statusPill_neutral: { backgroundColor: colors.surfaceMuted, borderColor: colors.line }, statusPill_success: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' }, statusPill_warning: { backgroundColor: colors.warningSoft, borderColor: '#FDE68A' }, statusPill_danger: { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' }, statusPill_info: { backgroundColor: colors.infoSoft, borderColor: '#BFDBFE' }, statusPillText: { ...type.caption, fontWeight: '600' }, statusPillText_neutral: { color: colors.muted }, statusPillText_success: { color: colors.success }, statusPillText_warning: { color: colors.warning }, statusPillText_danger: { color: colors.danger }, statusPillText_info: { color: colors.info },
});
