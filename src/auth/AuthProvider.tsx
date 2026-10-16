/**
 * @module auth/AuthProvider
 * @description React context provider for authentication state.
 *
 * This provider wraps the entire application (injected into the existing
 * provider chain in `app/_layout.tsx`) and manages:
 * - Session hydration from secure storage on app startup
 * - Login, registration, and logout flows
 * - Automatic token refresh scheduling
 * - Error state propagation
 *
 * Architecture note: This provider is designed to be inserted into the existing
 * provider chain WITHOUT modifying the existing NotificationProvider,
 * PreferencesProvider, or WorkspaceProvider. It wraps around them.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import * as authService from './authService';
import { clearTokens, hasStoredTokens, setRefreshCallback } from './tokenManager';
import {
  AuthContextValue,
  AuthState,
  AuthStatus,
  LoginRequest,
  PasswordChangeRequest,
  RegisterRequest,
  User,
} from './types';

// ---------------------------------------------------------------------------
// State reducer
// ---------------------------------------------------------------------------

type AuthAction =
  | { type: 'SET_STATUS'; status: AuthStatus }
  | { type: 'SET_AUTHENTICATED'; user: User }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'UPDATE_USER'; user: Partial<User> };

const initialState: AuthState = {
  status: 'idle',
  user: null,
  tokens: null,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_STATUS':
      return { ...state, status: action.status, error: null };
    case 'SET_AUTHENTICATED':
      return { ...state, status: 'authenticated', user: action.user, error: null };
    case 'SET_UNAUTHENTICATED':
      return { ...state, status: 'unauthenticated', user: null, tokens: null, error: null };
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'UPDATE_USER':
      return state.user
        ? { ...state, user: { ...state.user, ...action.user } }
        : state;
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const mountedRef = useRef(true);

  // ---- Session hydration on app startup ------------------------------------
  useEffect(() => {
    mountedRef.current = true;

    async function hydrate() {
      dispatch({ type: 'SET_STATUS', status: 'authenticating' });

      const hasTokens = await hasStoredTokens();
      if (!hasTokens) {
        if (mountedRef.current) dispatch({ type: 'SET_UNAUTHENTICATED' });
        return;
      }

      try {
        // Verify session with the backend by fetching the profile
        const user = await authService.getProfile();
        if (mountedRef.current) dispatch({ type: 'SET_AUTHENTICATED', user });
      } catch {
        // Tokens are invalid or expired — force unauthenticated state
        await clearTokens();
        if (mountedRef.current) dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    }

    void hydrate();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Register the token refresh callback ---------------------------------
  useEffect(() => {
    setRefreshCallback(async () => {
      try {
        await authService.refreshSession();
        // Optionally re-fetch user profile to sync tier/role changes
        const user = await authService.getProfile();
        if (mountedRef.current) dispatch({ type: 'SET_AUTHENTICATED', user });
      } catch {
        await clearTokens();
        if (mountedRef.current) dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    });
  }, []);

  // ---- Action handlers -----------------------------------------------------

  const login = useCallback(async (request: LoginRequest) => {
    dispatch({ type: 'SET_STATUS', status: 'authenticating' });
    try {
      const response = await authService.login(request);
      dispatch({ type: 'SET_AUTHENTICATED', user: response.user });
    } catch (error) {
      const message = error instanceof authService.AuthError
        ? error.message
        : 'Login failed. Please check your connection.';
      dispatch({ type: 'SET_ERROR', error: message });
      throw error;
    }
  }, []);

  const register = useCallback(async (request: RegisterRequest) => {
    dispatch({ type: 'SET_STATUS', status: 'authenticating' });
    try {
      const response = await authService.register(request);
      dispatch({ type: 'SET_AUTHENTICATED', user: response.user });
    } catch (error) {
      const message = error instanceof authService.AuthError
        ? error.message
        : 'Registration failed. Please check your connection.';
      dispatch({ type: 'SET_ERROR', error: message });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      await authService.refreshSession();
      const user = await authService.getProfile();
      dispatch({ type: 'SET_AUTHENTICATED', user });
    } catch {
      await clearTokens();
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await authService.requestPasswordReset(email);
  }, []);

  const changePassword = useCallback(async (request: PasswordChangeRequest) => {
    await authService.changePassword(request);
  }, []);

  const updateProfile = useCallback(async (
    updates: Partial<Pick<User, 'displayName' | 'organizationName' | 'avatarUrl'>>,
  ) => {
    const updated = await authService.updateProfile(updates);
    dispatch({ type: 'UPDATE_USER', user: updated });
  }, []);

  const enrollOrganization = useCallback(async (organizationName: string) => {
    const updated = await authService.enrollOrganization(organizationName);
    dispatch({ type: 'SET_AUTHENTICATED', user: updated });
  }, []);

  // ---- Context value -------------------------------------------------------

  const value = useMemo<AuthContextValue>(() => ({
    state,
    isAuthenticated: state.status === 'authenticated',
    isLoading: state.status === 'idle' || state.status === 'authenticating',
    user: state.user,
    login,
    register,
    logout,
    refreshSession,
    requestPasswordReset,
    changePassword,
    updateProfile,
    enrollOrganization,
  }), [state, login, register, logout, refreshSession, requestPasswordReset, changePassword, updateProfile, enrollOrganization]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the authentication context.
 *
 * @throws {Error} If used outside of AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
