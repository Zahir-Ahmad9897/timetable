import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../auth';
import { colors, radius, space, type } from '../theme';

type PublicHeaderProps = {
  active?: 'home' | 'pricing' | 'contact';
  onFeaturesPress?: () => void;
};

export function PublicHeader({ active, onFeaturesPress }: PublicHeaderProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const compact = width < 760;

  const go = (path: '/welcome' | '/pricing' | '/contact' | '/auth' | '/workspace') => {
    setMenuOpen(false);
    router.push(path as never);
  };

  const nav = (
    <>
      <NavLink label="Home" active={active === 'home'} onPress={() => go('/welcome')} />
      <NavLink label="Features" onPress={() => {
        setMenuOpen(false);
        if (onFeaturesPress) onFeaturesPress();
        else go('/welcome');
      }} />
      <NavLink label="Pricing" active={active === 'pricing'} onPress={() => go('/pricing')} />
      <NavLink label="Contact" active={active === 'contact'} onPress={() => go('/contact')} />
    </>
  );

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Pressable accessibilityRole="link" accessibilityLabel="Timetable AI home" onPress={() => go('/welcome')} style={styles.brand}>
          <View style={styles.logo}><Ionicons name="calendar" size={20} color="#FFFFFF" /></View>
          <View>
            <Text style={styles.brandName}>Timetable AI</Text>
            <Text style={styles.brandTag}>Academic scheduling</Text>
          </View>
        </Pressable>

        {compact ? (
          <Pressable accessibilityRole="button" accessibilityLabel={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} onPress={() => setMenuOpen((value) => !value)} style={styles.menuButton}>
            <Ionicons name={menuOpen ? 'close' : 'menu'} size={25} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={styles.desktopRight}>
            <View style={styles.nav}>{nav}</View>
            <Pressable onPress={() => go(isAuthenticated ? '/workspace' : '/auth')} style={styles.signInButton}>
              <Text style={styles.signInText}>{isAuthenticated ? 'Open dashboard' : 'Sign in'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </View>

      {compact && menuOpen ? (
        <View style={styles.mobileMenu}>
          {nav}
          <Pressable onPress={() => go(isAuthenticated ? '/workspace' : '/auth')} style={styles.mobileCta}>
            <Text style={styles.signInText}>{isAuthenticated ? 'Open dashboard' : 'Sign in or create account'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function NavLink({ label, active = false, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.navLink, active && styles.navLinkActive, pressed && styles.pressed]}>
      <Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { width: '100%', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, zIndex: 10 },
  header: { width: '100%', maxWidth: 1180, minHeight: 72, paddingHorizontal: space.md, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5' },
  brandName: { ...type.label, color: colors.ink, fontWeight: '800', fontSize: 15 },
  brandTag: { ...type.caption, color: colors.muted, fontSize: 10 },
  desktopRight: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navLink: { minHeight: 42, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  navLinkActive: { backgroundColor: colors.accentSoft },
  navText: { ...type.label, color: colors.muted },
  navTextActive: { color: colors.accent, fontWeight: '700' },
  signInButton: { minHeight: 42, paddingHorizontal: 17, borderRadius: radius.md, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B' },
  signInText: { ...type.label, color: '#FFFFFF', fontWeight: '700' },
  menuButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  mobileMenu: { padding: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.line, gap: 2 },
  mobileCta: { minHeight: 46, marginTop: space.sm, borderRadius: radius.md, backgroundColor: '#18181B', alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
});
