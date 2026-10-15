import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { AuthGuard } from '../../src/auth';
import SetupScreen from '../../src/screens/SetupScreen';

const pages = ['departments', 'semesters', 'sections', 'courses', 'teachers', 'assignments', 'rooms', 'settings'] as const;
export function generateStaticParams() { return pages.map((page) => ({ page })); }
export default function ResourceRoute() {
  const router = useRouter();
  const { page, id } = useLocalSearchParams<{ page: string; id?: string }>();
  if (!pages.includes(page as typeof pages[number])) return <Redirect href="/workspace" />;
  return <AuthGuard minimumRole="editor"><SetupScreen initialPage={page as typeof pages[number]} initialEditingId={id} onClose={() => router.back()} /></AuthGuard>;
}
