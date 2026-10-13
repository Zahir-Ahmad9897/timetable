import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, type } from '../../theme';
import * as Haptics from 'expo-haptics';
import { usePreferences } from '../../state/PreferencesProvider';

export function Button({ label, onPress, variant = 'primary', disabled = false, loading = false, accessibilityHint, icon }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'quiet'; disabled?: boolean; loading?: boolean; accessibilityHint?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const { preferences } = usePreferences();
  const foreground = variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.primary;
  const handlePress = () => {
    if (preferences.hapticsEnabled && Platform.OS !== 'web') void Haptics.selectionAsync();
    onPress();
  };
  return <Pressable accessibilityRole="button" accessibilityHint={accessibilityHint} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={handlePress} style={({ pressed }) => [styles.button, styles[`button_${variant}`], (disabled || loading) && styles.disabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={foreground} /> : <View style={styles.buttonContent}>{icon ? <Ionicons name={icon} size={18} color={foreground} /> : null}<Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text></View>}</Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, ...Platform.select({ ios: { shadowColor: colors.ink, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 1 }, android: { elevation: 1 } }) },
  button_primary: { backgroundColor: colors.primary, borderColor: colors.primary }, button_secondary: { backgroundColor: colors.raised, borderColor: colors.line }, button_danger: { backgroundColor: colors.dangerSoft, borderColor: '#FCA5A5' }, button_quiet: { backgroundColor: 'transparent', borderColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, buttonText: { fontSize: 14, fontWeight: '600' }, buttonText_primary: { color: colors.white }, buttonText_secondary: { color: colors.ink }, buttonText_danger: { color: colors.danger }, buttonText_quiet: { color: colors.muted }, disabled: { opacity: 0.42 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
