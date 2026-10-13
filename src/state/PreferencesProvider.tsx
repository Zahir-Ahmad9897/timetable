import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { AppPreferences, defaultPreferences, loadPreferences, savePreferences } from '../storage/preferenceStorage';

type PreferencesState = {
  loading: boolean;
  preferences: AppPreferences;
  colorScheme: 'light' | 'dark';
  setPreference: <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => Promise<void>;
};

const Context = createContext<PreferencesState | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme() ?? 'light');
  useEffect(() => {
    loadPreferences().then(setPreferences).finally(() => setLoading(false));
    const subscription = Appearance.addChangeListener(({ colorScheme }) => setSystemScheme(colorScheme ?? 'light'));
    return () => subscription.remove();
  }, []);
  const setPreference = async <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    await savePreferences(next);
  };
  const colorScheme = preferences.theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preferences.theme;
  useEffect(() => {
    (Appearance.setColorScheme as (scheme: 'light' | 'dark' | null) => void)(preferences.theme === 'system' ? null : preferences.theme);
  }, [preferences.theme]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const dark = colorScheme === 'dark';
    const values: Record<string, string> = dark ? {
      canvas: '#09090B', surface: '#18181B', raised: '#27272A', 'surface-muted': '#27272A', ink: '#FAFAFA', muted: '#A1A1AA', subtle: '#71717A', line: '#3F3F46', 'line-strong': '#52525B', primary: '#E4E4E7', 'primary-pressed': '#D4D4D8', 'primary-soft': '#27272A', 'on-primary': '#18181B',
    } : {
      canvas: '#FAFAFA', surface: '#FFFFFF', raised: '#FFFFFF', 'surface-muted': '#F4F4F5', ink: '#18181B', muted: '#71717A', subtle: '#A1A1AA', line: '#E4E4E7', 'line-strong': '#D4D4D8', primary: '#18181B', 'primary-pressed': '#27272A', 'primary-soft': '#F4F4F5', 'on-primary': '#FFFFFF',
    };
    Object.entries(values).forEach(([name, value]) => document.documentElement.style.setProperty(`--${name}`, value));
    document.documentElement.style.colorScheme = colorScheme;
  }, [colorScheme]);
  const value = useMemo(() => ({ loading, preferences, colorScheme, setPreference }), [loading, preferences, colorScheme]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider.');
  return value;
}
