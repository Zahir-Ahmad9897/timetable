import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth';
import { colors, radius, space, type } from '../theme';
import { PublicHeader } from './PublicHeader';

const features = [
  { icon: 'sparkles-outline' as const, title: 'Smart generation', detail: 'Build complete weekly schedules while checking teacher, room, capacity, break, and course constraints.' },
  { icon: 'business-outline' as const, title: 'Made for institutions', detail: 'Organize departments, semesters, sections, courses, teachers, rooms, and assignments in one workspace.' },
  { icon: 'document-attach-outline' as const, title: 'Import and export', detail: 'Start from an academic workbook, then share polished timetable results through Excel and PDF.' },
  { icon: 'shield-checkmark-outline' as const, title: 'Secure by design', detail: 'Private accounts, role-based access, protected sessions, and institution-level administration are built in.' },
  { icon: 'phone-portrait-outline' as const, title: 'Web and mobile', detail: 'Use the same clear workflow from a desktop browser, Android phone, iPhone, or tablet.' },
  { icon: 'options-outline' as const, title: 'Human control', detail: 'Review warnings, adjust constraints, regenerate, and approve the final schedule before publishing.' },
];

const workflow = [
  ['01', 'Create your account', 'Start free and set up your institution or department.'],
  ['02', 'Add academic data', 'Enter resources manually or import an existing workbook.'],
  ['03', 'Generate and review', 'Create a validated timetable, resolve issues, and export the result.'],
];

export function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const featureY = useRef(0);
  const desktop = width >= 900;
  const goToApp = () => router.push((isAuthenticated ? '/workspace' : '/auth?mode=register') as never);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PublicHeader active="home" onFeaturesPress={() => scrollRef.current?.scrollTo({ y: featureY.current, animated: true })} />
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, desktop && styles.heroDesktop]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrowPill}>
              <View style={styles.liveDot} />
              <Text style={styles.eyebrow}>ACADEMIC SCHEDULING, SIMPLIFIED</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.heroTitle, desktop && styles.heroTitleDesktop]}>Build conflict-free timetables in minutes.</Text>
            <Text style={styles.heroDetail}>A complete scheduling workspace for universities, departments, and educators. Add your academic data, generate a validated timetable, and export it from web or mobile.</Text>
            <View style={styles.heroActions}>
              <Pressable onPress={goToApp} style={styles.primaryCta}>
                <Text style={styles.primaryCtaText}>{isAuthenticated ? 'Open your workspace' : 'Start free'}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
              <Pressable onPress={() => router.push('/pricing' as never)} style={styles.secondaryCta}>
                <Text style={styles.secondaryCtaText}>View plans</Text>
              </Pressable>
            </View>
            <View style={styles.trustRow}>
              {['No card required', '5 free test runs', 'Manual or Excel setup'].map((item) => <View key={item} style={styles.trustItem}><Ionicons name="checkmark-circle" size={17} color="#059669" /><Text style={styles.trustText}>{item}</Text></View>)}
            </View>
          </View>

          <View style={styles.previewWrap}>
            <View style={styles.previewGlow} />
            <View style={styles.previewCard}>
              <View style={styles.previewTop}><View><Text style={styles.previewEyebrow}>LIVE WORKSPACE</Text><Text style={styles.previewTitle}>Fall timetable overview</Text></View><View style={styles.status}><View style={styles.liveDot} /><Text style={styles.statusText}>Ready</Text></View></View>
              <View style={styles.metricRow}>
                {[['5', 'Departments'], ['8', 'Semesters'], ['100', 'Courses']].map(([value, label]) => <View key={label} style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>)}
              </View>
              <View style={styles.schedule}>
                <View style={styles.scheduleHead}><Text style={styles.day}>MONDAY</Text><Text style={styles.scheduleMeta}>3 scheduled classes</Text></View>
                <ScheduleItem time="08:30" course="Software Engineering" meta="Room 204 · BSCS 7A" color="#4F46E5" />
                <ScheduleItem time="10:00" course="Database Systems" meta="Lab 2 · BSCS 5A" color="#059669" />
                <ScheduleItem time="12:30" course="Artificial Intelligence" meta="Room 108 · BSCS 8B" color="#D97706" />
              </View>
              <View style={styles.validated}><Ionicons name="shield-checkmark" size={19} color="#059669" /><View><Text style={styles.validatedTitle}>All constraints validated</Text><Text style={styles.validatedText}>No room, teacher, or section conflicts found.</Text></View></View>
            </View>
          </View>
        </View>

        <View style={styles.audienceStrip}>
          <Text style={styles.audienceLead}>Designed for real academic teams</Text>
          <View style={styles.audienceItems}>{['Universities', 'Departments', 'Colleges', 'Schools'].map((item) => <Text key={item} style={styles.audienceItem}>{item}</Text>)}</View>
        </View>

        <View onLayout={(event) => { featureY.current = event.nativeEvent.layout.y; }} style={styles.section}>
          <SectionHeading eyebrow="EVERYTHING IN ONE PLACE" title="From raw academic data to a ready timetable" detail="A focused toolset for the people who actually plan, review, and publish schedules." />
          <View style={styles.featureGrid}>
            {features.map((feature) => <View key={feature.title} style={[styles.featureCard, { width: desktop ? '31.8%' : width >= 600 ? '48%' : '100%' }]}><View style={styles.featureIcon}><Ionicons name={feature.icon} size={24} color="#4F46E5" /></View><Text style={styles.featureTitle}>{feature.title}</Text><Text style={styles.featureDetail}>{feature.detail}</Text></View>)}
          </View>
        </View>

        <View style={[styles.section, styles.workflowSection]}>
          <SectionHeading eyebrow="A CLEAR WORKFLOW" title="Start planning in three steps" detail="No complicated setup. Bring your data, define your rules, and let the workspace guide you." />
          <View style={[styles.workflowGrid, !desktop && styles.workflowStack]}>
            {workflow.map(([number, title, detail], index) => <React.Fragment key={number}><View style={styles.workflowCard}><Text style={styles.stepNumber}>{number}</Text><Text style={styles.workflowTitle}>{title}</Text><Text style={styles.workflowDetail}>{detail}</Text></View>{desktop && index < workflow.length - 1 ? <Ionicons name="arrow-forward" size={24} color={colors.lineStrong} /> : null}</React.Fragment>)}
          </View>
        </View>

        <View style={styles.ctaPanel}>
          <View style={styles.ctaCopy}><Text style={styles.ctaEyebrow}>READY TO BUILD A BETTER SCHEDULE?</Text><Text style={styles.ctaTitle}>Create your first timetable today.</Text><Text style={styles.ctaDetail}>Try the complete setup flow with up to 5 departments, 8 semesters, 2 sections per semester, 100 courses, and 5 generation runs.</Text></View>
          <Pressable onPress={goToApp} style={styles.lightCta}><Text style={styles.lightCtaText}>{isAuthenticated ? 'Go to workspace' : 'Create free account'}</Text><Ionicons name="arrow-forward" size={18} color="#18181B" /></Pressable>
        </View>

        <Footer onContact={() => router.push('/contact' as never)} onPricing={() => router.push('/pricing' as never)} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ScheduleItem({ time, course, meta, color }: { time: string; course: string; meta: string; color: string }) {
  return <View style={styles.scheduleItem}><Text style={styles.time}>{time}</Text><View style={[styles.courseLine, { backgroundColor: color }]} /><View style={styles.courseCopy}><Text numberOfLines={1} style={styles.course}>{course}</Text><Text style={styles.courseMeta}>{meta}</Text></View></View>;
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return <View style={styles.sectionHeading}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDetail}>{detail}</Text></View>;
}

export function Footer({ onContact, onPricing }: { onContact: () => void; onPricing: () => void }) {
  return <View style={styles.footer}><View style={styles.footerBrand}><View style={styles.logoSmall}><Ionicons name="calendar" size={17} color="#FFFFFF" /></View><View><Text style={styles.footerName}>Timetable AI</Text><Text style={styles.footerTag}>Smarter academic scheduling for every team.</Text></View></View><View style={styles.footerLinks}><Pressable onPress={onPricing}><Text style={styles.footerLink}>Pricing</Text></Pressable><Pressable onPress={onContact}><Text style={styles.footerLink}>Contact</Text></Pressable></View><Text style={styles.copyright}>© {new Date().getFullYear()} Timetable AI</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  page: { backgroundColor: colors.canvas },
  hero: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: space.md, paddingTop: 54, paddingBottom: 64, gap: 44 },
  heroDesktop: { minHeight: 650, flexDirection: 'row', alignItems: 'center', paddingTop: 70, paddingBottom: 80 },
  heroCopy: { flex: 1, maxWidth: 610 },
  eyebrowPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: '#EEF2FF', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  eyebrow: { ...type.caption, color: '#4338CA', fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { color: colors.ink, fontSize: 42, lineHeight: 47, fontWeight: '800', letterSpacing: -1.6, marginTop: space.lg },
  heroTitleDesktop: { fontSize: 60, lineHeight: 64, letterSpacing: -2.6 },
  heroDetail: { color: colors.muted, fontSize: 17, lineHeight: 27, maxWidth: 570, marginTop: space.md },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space.lg },
  primaryCta: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: 21, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryCtaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryCta: { minHeight: 50, borderRadius: radius.md, paddingHorizontal: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  secondaryCtaText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: space.md },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { ...type.caption, color: colors.muted },
  previewWrap: { flex: 1, width: '100%', minWidth: 0, maxWidth: 520, position: 'relative' },
  previewGlow: { position: 'absolute', top: -24, left: -24, right: -24, bottom: -24, borderRadius: 42, backgroundColor: '#EEF2FF', opacity: 0.8, transform: [{ rotate: '-2deg' }] },
  previewCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: space.lg, shadowColor: '#312E81', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.12, shadowRadius: 36, elevation: 8 },
  previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  previewEyebrow: { ...type.caption, color: '#4F46E5', fontWeight: '800', letterSpacing: 0.7 },
  previewTitle: { ...type.title, color: colors.ink, marginTop: 3 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill },
  statusText: { ...type.caption, color: '#047857', fontWeight: '700' },
  metricRow: { flexDirection: 'row', gap: 8, marginTop: space.lg },
  metric: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: 11 },
  metricValue: { ...type.title, color: colors.ink },
  metricLabel: { fontSize: 10, lineHeight: 14, color: colors.muted },
  schedule: { marginTop: space.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, overflow: 'hidden' },
  scheduleHead: { padding: 11, backgroundColor: colors.surfaceMuted, flexDirection: 'row', justifyContent: 'space-between' },
  day: { ...type.caption, color: colors.ink, fontWeight: '800' },
  scheduleMeta: { fontSize: 10, color: colors.muted },
  scheduleItem: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, borderTopWidth: 1, borderTopColor: colors.line },
  time: { width: 45, fontSize: 11, color: colors.muted, fontWeight: '600' },
  courseLine: { width: 3, height: 34, borderRadius: 2, marginRight: 10 },
  courseCopy: { flex: 1 },
  course: { ...type.label, color: colors.ink, fontWeight: '700' },
  courseMeta: { fontSize: 10, color: colors.muted, marginTop: 2 },
  validated: { flexDirection: 'row', gap: 9, alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: radius.md, padding: 11, marginTop: space.md },
  validatedTitle: { ...type.caption, color: '#065F46', fontWeight: '800' },
  validatedText: { fontSize: 10, color: '#047857', marginTop: 1 },
  audienceStrip: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: space.md, paddingVertical: space.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  audienceLead: { ...type.caption, color: colors.muted, fontWeight: '700' },
  audienceItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  audienceItem: { ...type.label, color: colors.subtle, fontWeight: '800' },
  section: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: space.md, paddingVertical: 80 },
  sectionHeading: { alignItems: 'center', maxWidth: 680, alignSelf: 'center', marginBottom: 36 },
  sectionEyebrow: { ...type.caption, color: '#4F46E5', fontWeight: '800', letterSpacing: 1 },
  sectionTitle: { color: colors.ink, fontSize: 34, lineHeight: 41, fontWeight: '800', textAlign: 'center', letterSpacing: -1, marginTop: 9 },
  sectionDetail: { ...type.body, color: colors.muted, textAlign: 'center', marginTop: 10, fontSize: 16, lineHeight: 25 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center' },
  featureCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: radius.xl, padding: space.lg, minHeight: 220 },
  featureIcon: { width: 48, height: 48, borderRadius: 13, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: space.md },
  featureTitle: { ...type.title, color: colors.ink },
  featureDetail: { ...type.body, color: colors.muted, marginTop: space.sm },
  workflowSection: { paddingTop: 60 },
  workflowGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md },
  workflowStack: { flexDirection: 'column', alignItems: 'stretch' },
  workflowCard: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radius.xl, padding: space.lg, maxWidth: 360 },
  stepNumber: { color: '#4F46E5', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  workflowTitle: { ...type.title, color: colors.ink, marginTop: space.md },
  workflowDetail: { ...type.body, color: colors.muted, marginTop: space.sm },
  ctaPanel: { width: 'auto', maxWidth: 1148, alignSelf: 'center', marginHorizontal: space.md, backgroundColor: '#312E81', borderRadius: 22, padding: 34, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.lg },
  ctaCopy: { flex: 1, minWidth: 250, maxWidth: 720 },
  ctaEyebrow: { ...type.caption, color: '#C7D2FE', fontWeight: '800', letterSpacing: 0.8 },
  ctaTitle: { color: '#FFFFFF', fontSize: 30, lineHeight: 37, fontWeight: '800', marginTop: 7 },
  ctaDetail: { ...type.body, color: '#E0E7FF', marginTop: 8 },
  lightCta: { minHeight: 50, backgroundColor: '#FFFFFF', borderRadius: radius.md, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  lightCtaText: { color: '#18181B', fontSize: 14, fontWeight: '800' },
  footer: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: space.md, paddingVertical: 42, marginTop: 60, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.lg, borderTopWidth: 1, borderTopColor: colors.line },
  footerBrand: { flex: 1, minWidth: 240, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoSmall: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5' },
  footerName: { ...type.label, color: colors.ink, fontWeight: '800' },
  footerTag: { ...type.caption, color: colors.muted },
  footerLinks: { flexDirection: 'row', gap: space.lg },
  footerLink: { ...type.label, color: colors.muted },
  copyright: { ...type.caption, color: colors.subtle },
});
