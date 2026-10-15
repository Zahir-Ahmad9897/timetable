import React from 'react';
import { AuthGuard } from '../src/auth';
import AcademicImportScreen from '../src/screens/AcademicImportScreen';

export default function AcademicImportRoute() {
  return <AuthGuard minimumRole="editor" minimumTier="pro" showPaywall><AcademicImportScreen /></AuthGuard>;
}
