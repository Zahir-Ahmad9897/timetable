export type ThemePreference = 'system' | 'light' | 'dark';
export type AppPreferences = {
  onboardingComplete: boolean;
  theme: ThemePreference;
  hapticsEnabled: boolean;
  lastSeenVersion: string;
};

export const defaultPreferences: AppPreferences = {
  onboardingComplete: false,
  theme: 'system',
  hapticsEnabled: true,
  lastSeenVersion: '',
};

