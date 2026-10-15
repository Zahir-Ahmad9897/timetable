/**
 * @file app/auth.tsx
 * @description Standalone authentication modal screen for Expo Router.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreen } from '../src/screens/auth/AuthScreen';
import { colors } from '../src/theme';

export default function AuthRoute() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AuthScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
