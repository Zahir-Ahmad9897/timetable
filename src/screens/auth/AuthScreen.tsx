/**
 * @module screens/auth/AuthScreen
 * @description Standalone authentication screen with Sign In and Registration tabs.
 *
 * Provides a self-contained authentication experience for timetable-mobile:
 * - Login with email & password
 * - Registration with organization branding
 * - One-click demo credentials for offline evaluators
 * - Immediate session activation without external dependencies
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../auth/AuthProvider';
import { Banner, Button, Card, PageIntro, StatusPill } from '../../components/ui';
import { useSubscription } from '../../subscription/SubscriptionProvider';
import { colors, radius, space, type } from '../../theme';

export function AuthScreen() {
  const router = useRouter();
  const { login, register, isAuthenticated, user, logout } = useAuth();
  const { currentPlan } = useSubscription();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (mode === 'register' && !displayName) {
      setError('Please enter your display name.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'signin') {
        await login({ email, password });
      } else {
        await register({
          email,
          password,
          displayName,
          organizationName: organizationName || undefined,
        });
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin@irid.ai');
    setPassword('Password123!');
    setMode('signin');
    setError(null);
  };

  if (isAuthenticated && user) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <PageIntro
          eyebrow="USER ACCOUNT"
          title="Account Profile"
          detail="Manage your active timetable-mobile authentication session."
        />
        <Card>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.userName}>{user.displayName || user.email}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <StatusPill tone="info" label={currentPlan.tier.toUpperCase()} />
          </View>

          {user.organizationName && (
            <Text style={styles.orgText}>Organization: {user.organizationName}</Text>
          )}

          <View style={styles.sessionMeta}>
            <Text style={styles.metaLabel}>Role: {user.role}</Text>
            <Text style={styles.metaLabel}>
              Status: {user.emailVerified ? 'Verified Account' : 'Pending Verification'}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Button
              variant="secondary"
              label="Upgrade Subscription"
              onPress={() => router.push('/pricing' as any)}
            />
            <Button
              variant="danger"
              label="Sign Out"
              onPress={() => {
                void logout();
              }}
            />
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <PageIntro
          eyebrow="STANDALONE AUTHENTICATION"
          title="Sign in to Timetable"
          detail="Access your private workspaces, subscription quotas, and institutional timetable tools."
        />

        {/* Tab Toggle */}
        <View style={styles.tabsWrapper}>
          <Pressable
            style={[styles.tabButton, mode === 'signin' && styles.tabButtonActive]}
            onPress={() => {
              setMode('signin');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
              Sign In
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
            onPress={() => {
              setMode('register');
              setError(null);
            }}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              Create Account
            </Text>
          </Pressable>
        </View>

        {error && <Banner type="warning" text={error} />}

        <Card style={styles.formCard}>
          {mode === 'register' && (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Display Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Dr. Sarah Khan"
                  placeholderTextColor={colors.subtle}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Department / Faculty (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Computer Software Engineering"
                  placeholderTextColor={colors.subtle}
                  value={organizationName}
                  onChangeText={setOrganizationName}
                />
              </View>
            </>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@university.edu"
              placeholderTextColor={colors.subtle}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={colors.subtle}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.submitWrapper}>
            <Button
              variant="primary"
              label={loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              onPress={() => void handleSubmit()}
              disabled={loading}
            />
          </View>

          {mode === 'signin' && (
            <View style={styles.demoSection}>
              <Text style={styles.demoText}>Testing locally or offline?</Text>
              <Button
                variant="quiet"
                label="Quick-Fill Demo Administrator"
                onPress={fillDemoCredentials}
              />
            </View>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    padding: space.md,
    paddingBottom: space.xxl,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    gap: space.md,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tabButton: {
    flex: 1,
    paddingVertical: space.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    ...type.label,
    color: colors.muted,
  },
  tabTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  formCard: {
    padding: space.lg,
    gap: space.md,
  },
  fieldGroup: {
    gap: space.xs,
  },
  fieldLabel: {
    ...type.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  input: {
    minHeight: 44,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.ink,
    ...type.body,
  },
  submitWrapper: {
    marginTop: space.xs,
  },
  demoSection: {
    alignItems: 'center',
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 4,
  },
  demoText: {
    ...type.caption,
    color: colors.muted,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    ...type.title,
    color: colors.ink,
  },
  userEmail: {
    ...type.body,
    color: colors.muted,
  },
  orgText: {
    ...type.caption,
    color: colors.ink,
  },
  sessionMeta: {
    flexDirection: 'row',
    gap: space.md,
    paddingVertical: space.xs,
  },
  metaLabel: {
    ...type.caption,
    color: colors.muted,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.sm,
  },
});
