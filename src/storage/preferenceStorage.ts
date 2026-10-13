import * as FileSystem from 'expo-file-system/legacy';

import { AppPreferences, defaultPreferences } from './preferenceTypes';
export { AppPreferences, defaultPreferences, ThemePreference } from './preferenceTypes';

const uri = () => {
  if (!FileSystem.documentDirectory) throw new Error('Private device storage is unavailable.');
  return `${FileSystem.documentDirectory}iridai-timetable-preferences.json`;
};

export async function loadPreferences(): Promise<AppPreferences> {
  try {
    const info = await FileSystem.getInfoAsync(uri());
    if (!info.exists) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(await FileSystem.readAsStringAsync(uri())) };
  } catch {
    return defaultPreferences;
  }
}

export async function savePreferences(value: AppPreferences): Promise<void> {
  await FileSystem.writeAsStringAsync(uri(), JSON.stringify(value));
}
