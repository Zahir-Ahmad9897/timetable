/**
 * @file app/auth.tsx
 * @description Standalone authentication modal screen for Expo Router.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthScreen } from '../src/screens/auth/AuthScreen';
import { colors } from '../src/theme';
import { PublicHeader } from '../src/marketing/PublicHeader';

export default function AuthRoute() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <PublicHeader />
      <View style={styles.content}><AuthScreen /></View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    flex: 1,
  },
});
