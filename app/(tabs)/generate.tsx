import React from 'react';
import { useRouter } from 'expo-router';
import GenerateScreen from '../../src/screens/GenerateScreen';
export default function GenerateRoute() { const router = useRouter(); return <GenerateScreen onOpenTimetable={() => router.navigate('/timetable')} />; }

