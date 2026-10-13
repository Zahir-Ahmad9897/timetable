import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, type } from '../../theme';

export function Banner({ type: bannerType, text }: { type: 'error' | 'success' | 'warning' | 'info'; text: string }) {
  const icon = bannerType === 'error' ? 'alert-circle' : bannerType === 'warning' ? 'warning' : bannerType === 'success' ? 'checkmark-circle' : 'information-circle';
  return <View accessibilityRole={bannerType === 'error' ? 'alert' : undefined} style={[styles.banner, styles[`banner_${bannerType}`]]}><Ionicons name={icon} size={20} color={bannerType === 'error' ? colors.danger : bannerType === 'warning' ? colors.warning : bannerType === 'success' ? colors.success : colors.info} /><Text style={[styles.bannerText, styles[`bannerText_${bannerType}`]]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  banner: { borderRadius: radius.md, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, banner_error: { backgroundColor: colors.dangerSoft, borderColor: '#FECACA' }, banner_success: { backgroundColor: colors.successSoft, borderColor: '#A7F3D0' }, banner_warning: { backgroundColor: colors.warningSoft, borderColor: '#FDE68A' }, banner_info: { backgroundColor: colors.infoSoft, borderColor: '#BFDBFE' }, bannerText: { flex: 1, ...type.body, fontSize: 14 }, bannerText_error: { color: '#991B1B' }, bannerText_success: { color: '#065F46' }, bannerText_warning: { color: '#92400E' }, bannerText_info: { color: '#1E3A8A' },
});
