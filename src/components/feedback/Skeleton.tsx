import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';

export function Skeleton({ width, height = 16, borderRadius = radius.sm, style }: { width: number | string; height?: number; borderRadius?: number; style?: import('react-native').ViewStyle }) {
  return <View style={[styles.skeleton, { width: width as number, height, borderRadius }, style]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width="40%" height={14} />
      <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
      <Skeleton width="90%" height={12} style={{ marginTop: 4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { backgroundColor: colors.surfaceMuted },
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 4 },
});
