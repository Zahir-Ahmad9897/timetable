import React from 'react';
import { useRouter } from 'expo-router';
import TimetableScreen from '../../src/screens/TimetableScreen';
export default function TimetableRoute() { const router = useRouter(); return <TimetableScreen onGenerate={() => router.navigate('/generate')} />; }

