/**
 * @module auth
 * @description Central export barrel for the irid.ai Timetable authentication & authorization system.
 */

export * from './types';
export * from './tokenManager';
export * as authService from './authService';
export { AuthProvider, useAuth } from './AuthProvider';
export { AuthGuard } from './AuthGuard';
export * from './permissions';
export * from './rbac';
