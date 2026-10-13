import React from 'react';
import { Redirect } from 'expo-router';
import { usePreferences } from '../src/state/PreferencesProvider';

export default function Index() {
  const { preferences } = usePreferences();
  return <Redirect href={preferences.onboardingComplete ? '/workspace' : '/welcome'} />;
}

