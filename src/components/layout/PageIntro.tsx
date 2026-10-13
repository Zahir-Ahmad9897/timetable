import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../../theme';

export function PageIntro({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <View><Text style={styles.eyebrow}>{eyebrow}</Text><Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text><Text style={styles.pageDetail}>{detail}</Text></View>;
}

export function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return <View style={{ marginBottom: space.md }}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' }, pageTitle: { color: colors.ink, ...type.display, marginTop: 4 }, pageDetail: { color: colors.muted, ...type.body, marginTop: 6 }, sectionTitle: { color: colors.ink, ...type.title }, detail: { color: colors.muted, ...type.body, marginTop: 4 },
});

