import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, type } from '../../theme';

export function SearchField({ value, onChangeText, placeholder = 'Search records' }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return <View style={styles.search}><Ionicons name="search" size={20} color={colors.muted} /><TextInput accessibilityRole="search" accessibilityLabel={placeholder} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.subtle} autoCapitalize="none" autoCorrect={false} style={styles.searchInput} />{value ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => onChangeText('')}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable> : null}</View>;
}

export function ChipBar({ options, selected, onSelect, accessibilityLabel }: { options: { label: string; value: string }[]; selected: string; onSelect: (value: string) => void; accessibilityLabel: string }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipBar} accessibilityLabel={accessibilityLabel}>{options.map((option) => { const active = option.value === selected; return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => onSelect(option.value)} style={[styles.chip, active && styles.chipActive]}><Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text></Pressable>; })}</ScrollView>;
}

export function Pagination({ page, pageCount, total, onPageChange }: { page: number; pageCount: number; total: number; onPageChange: (page: number) => void }) {
  return <View accessibilityLabel={`Pagination, page ${page} of ${pageCount}`} style={styles.pagination}><Pressable accessibilityRole="button" accessibilityLabel="Previous page" accessibilityState={{ disabled: page <= 1 }} disabled={page <= 1} onPress={() => onPageChange(page - 1)} style={[styles.pageButton, page <= 1 && styles.disabled]}><Ionicons name="chevron-back" size={20} color={colors.primary} /></Pressable><View style={styles.pageSummary}><Text style={styles.pageText}>Page {page} of {pageCount}</Text><Text style={styles.pageCount}>{total} record{total === 1 ? '' : 's'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Next page" accessibilityState={{ disabled: page >= pageCount }} disabled={page >= pageCount} onPress={() => onPageChange(page + 1)} style={[styles.pageButton, page >= pageCount && styles.disabled]}><Ionicons name="chevron-forward" size={20} color={colors.primary} /></Pressable></View>;
}

const styles = StyleSheet.create({
  search: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }, searchInput: { flex: 1, minHeight: 42, color: colors.ink, ...type.body },
  chipBar: { gap: 8, paddingVertical: 4 }, chip: { minHeight: 44, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12 }, chipActive: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.ink, ...type.caption }, chipTextActive: { color: colors.white },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, pageButton: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }, pageSummary: { flex: 1, alignItems: 'center' }, pageText: { color: colors.ink, ...type.label }, pageCount: { color: colors.muted, ...type.caption }, disabled: { opacity: 0.42 },
});

