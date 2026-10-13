import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../../theme';

export function Card({ children, style }: { children: React.ReactNode; style?: import('react-native').ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, padding: 16, gap: 16 },
});
