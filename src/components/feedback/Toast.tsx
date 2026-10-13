import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, type } from '../../theme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({ message, type = 'info', visible, onDismiss, duration = 4500, actionLabel, onAction }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 20, duration: 200, useNativeDriver: true }),
        ]).start(() => onDismiss());
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  const iconName = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = type === 'success' ? colors.success : type === 'error' ? colors.danger : colors.info;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]} pointerEvents="box-none">
      <Pressable style={styles.toast} onPress={onDismiss} accessibilityRole="alert">
        <Ionicons name={iconName} size={18} color={iconColor} />
        <Text style={styles.text} numberOfLines={2}>{message}</Text>
        {actionLabel && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={() => { onAction(); onDismiss(); }} style={styles.action}><Text style={styles.actionText}>{actionLabel}</Text></Pressable> : null}
        <Ionicons name="close" size={16} color={colors.subtle} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 100, left: 24, right: 24, alignItems: 'center', zIndex: 9999 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.ink, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.lg, maxWidth: 400, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16 }, android: { elevation: 8 } }) },
  text: { flex: 1, color: colors.white, ...type.label },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { color: '#C7D2FE', ...type.label, fontWeight: '700' },
});
