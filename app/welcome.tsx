import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { Button } from '../src/components/ui';
import { usePreferences } from '../src/state/PreferencesProvider';
import { colors, radius, space, type } from '../src/theme';

const slides = [
  { icon: 'calendar-outline' as const, eyebrow: 'WELCOME', title: 'Plan complete academic timetables', detail: 'Build and review validated weekly schedules from organization or manual resource data.' },
  { icon: 'shield-checkmark-outline' as const, eyebrow: 'PRIVATE BY DESIGN', title: 'Your workspace stays local', detail: 'Records and generated timetables remain on this device unless you explicitly export them.' },
  { icon: 'checkmark-done-outline' as const, eyebrow: 'CONSTRAINT AWARE', title: 'Every draft is independently checked', detail: 'The generator refuses partial results and validates rooms, capacity, collisions, breaks, and teaching limits.' },
  { icon: 'people-outline' as const, eyebrow: 'HUMAN CONTROL', title: 'Review before you rely on it', detail: 'Similarity is not involved here: every schedule remains a draft until a coordinator reviews and saves it.' },
];

export default function WelcomeScreen() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const { setPreference } = usePreferences();
  const slide = slides[index]!;
  const finish = async () => { await setPreference('onboardingComplete', true); router.replace('/workspace'); };
  return <View style={styles.page}>
    <View style={styles.top}><Text style={styles.brand}>irid.ai Timetable</Text><Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding" onPress={() => { void finish(); }} style={styles.skip}><Text style={styles.skipText}>Skip</Text></Pressable></View>
    <Animated.View key={index} entering={FadeInRight.duration(240)} exiting={FadeOutLeft.duration(180)} style={styles.content}>
      <View style={styles.icon}><Ionicons name={slide.icon} size={42} color={colors.primary} /></View><Text style={styles.eyebrow}>{slide.eyebrow}</Text><Text accessibilityRole="header" style={styles.title}>{slide.title}</Text><Text style={styles.detail}>{slide.detail}</Text>
    </Animated.View>
    <View style={styles.footer}><View accessibilityLabel={`Step ${index + 1} of ${slides.length}`} style={styles.dots}>{slides.map((_, dot) => <View key={dot} style={[styles.dot, dot === index && styles.dotActive]} />)}</View><Button label={index === slides.length - 1 ? 'Start planning' : 'Continue'} icon={index === slides.length - 1 ? 'arrow-forward' : undefined} onPress={() => index === slides.length - 1 ? void finish() : setIndex(index + 1)} />{index > 0 ? <Button label="Back" variant="quiet" onPress={() => setIndex(index - 1)} /> : null}</View>
  </View>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.canvas, padding: space.lg }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: colors.ink, ...type.label }, skip: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, skipText: { color: colors.muted, ...type.label }, content: { flex: 1, justifyContent: 'center' }, icon: { width: 80, height: 80, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl }, eyebrow: { color: colors.accent, ...type.caption, letterSpacing: 1 }, title: { color: colors.ink, ...type.display, fontSize: 34, lineHeight: 40, marginTop: space.sm }, detail: { color: colors.muted, ...type.body, fontSize: 17, lineHeight: 26, marginTop: space.md }, footer: { gap: space.sm }, dots: { flexDirection: 'row', gap: 8, alignSelf: 'center', marginBottom: space.md }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.lineStrong }, dotActive: { width: 24, backgroundColor: colors.primary } });

