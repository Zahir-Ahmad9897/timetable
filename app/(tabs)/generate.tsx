import React from 'react';
import { useRouter } from 'expo-router';
import { AuthGuard } from '../../src/auth';
import GenerateScreen from '../../src/screens/GenerateScreen';
export default function GenerateRoute() { const router = useRouter(); return <AuthGuard minimumRole="editor"><GenerateScreen onOpenTimetable={() => router.navigate('/timetable')} /></AuthGuard>; }
