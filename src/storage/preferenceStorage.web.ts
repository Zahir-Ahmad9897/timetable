import { AppPreferences, defaultPreferences } from './preferenceTypes';
export { AppPreferences, defaultPreferences, ThemePreference } from './preferenceTypes';

const KEY = 'iridai-timetable-preferences';

export async function loadPreferences(): Promise<AppPreferences> {
  try {
    return { ...defaultPreferences, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return defaultPreferences;
  }
}

export async function savePreferences(value: AppPreferences): Promise<void> {
  localStorage.setItem(KEY, JSON.stringify(value));
}
