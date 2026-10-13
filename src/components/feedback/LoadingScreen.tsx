import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SkeletonCard } from './Skeleton';
import { colors, space, type } from '../../theme';

export function LoadingScreen() {
  return <View style={styles.page} accessibilityRole="progressbar"><Text style={styles.eyebrow}>LOCAL WORKSPACE</Text><Text style={styles.title}>Preparing your timetable</Text><Text style={styles.detail}>Reading private on-device data. No network connection is required.</Text><SkeletonCard /><SkeletonCard /><SkeletonCard /></View>;
}

const styles = StyleSheet.create({ page: { flex: 1, padding: space.md, gap: space.md, backgroundColor: colors.canvas }, eyebrow: { color: colors.muted, ...type.caption, marginTop: space.lg }, title: { color: colors.ink, ...type.display }, detail: { color: colors.muted, ...type.body, marginBottom: space.sm } });

