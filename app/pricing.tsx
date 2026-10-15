/**
 * @file app/pricing.tsx
 * @description SaaS pricing and subscription tier modal screen.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PricingScreen } from '../src/subscription/PricingScreen';
import { colors } from '../src/theme';

export default function PricingRoute() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <PricingScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});
