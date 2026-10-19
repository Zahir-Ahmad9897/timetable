import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth';
import { LoadingScreen } from '../src/components/feedback/LoadingScreen';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  return <Redirect href={isAuthenticated ? '/workspace' : '/welcome'} />;
}
