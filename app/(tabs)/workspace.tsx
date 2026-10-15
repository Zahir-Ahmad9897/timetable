import React from 'react';
import { AuthGuard } from '../../src/auth';
import SetupScreen from '../../src/screens/SetupScreen';
export default function WorkspaceRoute() { return <AuthGuard minimumRole="editor"><SetupScreen /></AuthGuard>; }
