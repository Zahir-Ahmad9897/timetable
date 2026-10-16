import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthGuard, useAuth } from '../src/auth';
import { Banner, Button, Card, Field, PageIntro } from '../src/components/ui';
import { colors, space, type } from '../src/theme';

function EnrollmentForm() {
  const router = useRouter();
  const { enrollOrganization } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const organizationName = name.trim();
    if (organizationName.length < 2) {
      setError('Enter your organization name before continuing.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await enrollOrganization(organizationName);
      router.replace('/workspace');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Organization enrollment failed.');
    } finally {
      setSaving(false);
    }
  };

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps={'handled'}>
      <PageIntro eyebrow={'FIRST-TIME ENROLLMENT'} title={'Register your organization'} detail={'Create the private organization for this account.'} />
      {error ? <Banner type={'error'} text={error} /> : null}
      <Card>
        <Field label={'Organization name'} value={name} onChangeText={setName} />
        <Text style={styles.note}>Timetable data stays on this device and is separated by account.</Text>
        <Button label={'Save organization'} loading={saving} disabled={saving || name.trim().length < 2} onPress={() => { void submit(); }} />
      </Card>
    </ScrollView>
  </KeyboardAvoidingView>;
}

export default function EnrollRoute() {
  return <AuthGuard requireEnrollment={false}><EnrollmentForm /></AuthGuard>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.canvas },
  page: { width: '100%', maxWidth: 600, alignSelf: 'center', padding: space.md, paddingTop: space.xl, gap: space.md },
  note: { color: colors.muted, ...type.body, marginVertical: space.md },
});
