import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../theme';
import { Footer } from './LandingScreen';
import { PublicHeader } from './PublicHeader';

export function ContactScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const open = (url: string) => { void Linking.openURL(url); };

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <PublicHeader active="contact" />
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>CONTACT & SUPPORT</Text>
        <Text accessibilityRole="header" style={styles.title}>Let’s plan a better timetable.</Text>
        <Text style={styles.detail}>Questions about setup, institutional access, imports, or subscriptions? Get in touch directly and we’ll help you choose the right path.</Text>
      </View>
      <View style={[styles.grid, !wide && styles.gridStack]}>
        <View style={styles.contactCard}>
          <View style={styles.icon}><Ionicons name="call-outline" size={25} color="#4F46E5" /></View>
          <Text style={styles.cardLabel}>PHONE & WHATSAPP</Text>
          <Text style={styles.cardTitle}>0334 1339897</Text>
          <Text style={styles.cardDetail}>Call for product, onboarding, and institution-level support.</Text>
          <View style={styles.actionRow}>
            <ContactButton label="Call now" icon="call" onPress={() => open('tel:+923341339897')} />
            <ContactButton label="WhatsApp" icon="logo-whatsapp" secondary onPress={() => open('https://wa.me/923341339897')} />
          </View>
        </View>
        <View style={styles.contactCard}>
          <View style={styles.icon}><Ionicons name="mail-outline" size={25} color="#4F46E5" /></View>
          <Text style={styles.cardLabel}>EMAIL</Text>
          <Text style={styles.cardTitle}>zahirahmad9897@gmail.com</Text>
          <Text style={styles.cardDetail}>Send project requirements, feedback, or a request for a product demonstration.</Text>
          <View style={styles.actionRow}><ContactButton label="Send email" icon="mail" onPress={() => open('mailto:zahirahmad9897@gmail.com?subject=Timetable%20AI%20enquiry')} /></View>
        </View>
      </View>
      <View style={styles.supportPanel}>
        <View style={styles.supportIcon}><Ionicons name="help-buoy-outline" size={28} color="#FFFFFF" /></View>
        <View style={styles.supportCopy}><Text style={styles.supportTitle}>Need help getting started?</Text><Text style={styles.supportText}>Create a free account, add data manually or import it, and test five timetable generations before choosing a subscription.</Text></View>
        <Pressable onPress={() => router.push('/auth?mode=register' as never)} style={styles.supportButton}><Text style={styles.supportButtonText}>Start free</Text><Ionicons name="arrow-forward" size={17} color="#18181B" /></Pressable>
      </View>
      <Footer onContact={() => undefined} onPricing={() => router.push('/pricing' as never)} />
    </ScrollView>
  </SafeAreaView>;
}

function ContactButton({ label, icon, secondary = false, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; secondary?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="link" onPress={onPress} style={[styles.button, secondary && styles.buttonSecondary]}><Ionicons name={icon} size={17} color={secondary ? colors.ink : '#FFFFFF'} /><Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  page: { backgroundColor: colors.canvas },
  hero: { width: '100%', maxWidth: 760, alignSelf: 'center', alignItems: 'center', paddingHorizontal: space.md, paddingTop: 70, paddingBottom: 44 },
  eyebrow: { ...type.caption, color: '#4F46E5', fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 42, lineHeight: 49, fontWeight: '800', letterSpacing: -1.5, textAlign: 'center', marginTop: 10 },
  detail: { color: colors.muted, fontSize: 17, lineHeight: 27, textAlign: 'center', marginTop: space.md },
  grid: { width: '100%', maxWidth: 1040, alignSelf: 'center', flexDirection: 'row', paddingHorizontal: space.md, gap: space.md },
  gridStack: { flexDirection: 'column' },
  contactCard: { flex: 1, minWidth: 0, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: space.lg },
  icon: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  cardLabel: { ...type.caption, color: '#4F46E5', fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { color: colors.ink, fontSize: 21, lineHeight: 28, fontWeight: '800', marginTop: 6 },
  cardDetail: { ...type.body, color: colors.muted, marginTop: space.sm, minHeight: 50 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.lg },
  button: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: '#4F46E5' },
  buttonSecondary: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.line },
  buttonText: { ...type.label, color: '#FFFFFF', fontWeight: '700' },
  buttonTextSecondary: { color: colors.ink },
  supportPanel: { width: 'auto', maxWidth: 1008, alignSelf: 'center', marginTop: space.lg, marginHorizontal: space.md, padding: space.lg, backgroundColor: '#312E81', borderRadius: radius.xl, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
  supportIcon: { width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.13)', alignItems: 'center', justifyContent: 'center' },
  supportCopy: { flex: 1, minWidth: 230 },
  supportTitle: { ...type.title, color: '#FFFFFF' },
  supportText: { ...type.body, color: '#E0E7FF', marginTop: 3 },
  supportButton: { minHeight: 46, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 7 },
  supportButtonText: { ...type.label, color: '#18181B', fontWeight: '800' },
});
