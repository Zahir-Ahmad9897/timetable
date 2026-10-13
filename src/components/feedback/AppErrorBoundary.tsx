import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '../primitives/Button';
import { colors, space, type } from '../../theme';

type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) { console.error('Application render error:', error.message); }
  render() {
    if (!this.state.error) return this.props.children;
    return <View style={styles.container} accessibilityRole="alert"><Text style={styles.title}>The timetable app hit an unexpected error</Text><Text style={styles.detail}>Your saved local workspace was not deleted. Try this screen again; if the problem continues, report the app version and the action you were taking.</Text><Button label="Try again" icon="refresh" onPress={() => this.setState({ error: null })} /><Button label="Report issue" variant="secondary" icon="mail-outline" onPress={() => { void Linking.openURL('mailto:support@irid.ai?subject=Timetable%20app%20issue'); }} /></View>;
  }
}

const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.md, backgroundColor: colors.canvas }, title: { color: colors.ink, ...type.display }, detail: { color: colors.muted, ...type.body } });

