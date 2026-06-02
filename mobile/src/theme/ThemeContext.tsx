import { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as lightColors } from './ui-reference';

const THEME_KEY = '@tanya_theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const darkColors = {
  emerald900: '#064e3b',
  emerald800: '#065f46',
  emerald600: '#059669',
  emerald100: '#1a3d2b',
  sand50: '#0d1f18',
  ink900: '#e8f5ef',
  ink600: '#6b9980',
  white: '#122d1f',

  emerald: '#0e9f6e',
  emeraldDark: '#34d399',
  emeraldSoft: '#0a2d20',
  emeraldTint: '#0d1f18',
  ink: '#e8f5ef',
  muted: '#6b9980',
  line: '#1d3d2a',
  paper: '#122d1f',
  bg: '#0d1f18',
} as const;

export { lightColors };

export type AppColors = typeof lightColors;

interface ThemeContextType {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (p: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  preference: 'system',
  resolved: 'light',
  setPreference: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  const resolved: ResolvedTheme =
    preference === 'system'
      ? ((Appearance.getColorScheme() as ResolvedTheme) ?? 'light')
      : preference;

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') {
        setPreferenceState(v);
      }
    });
  }, []);

  async function setPreference(p: ThemePreference) {
    setPreferenceState(p);
    await AsyncStorage.setItem(THEME_KEY, p);
  }

  return (
    <ThemeContext.Provider value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors(): AppColors {
  const { resolved } = useContext(ThemeContext);
  return resolved === 'dark' ? (darkColors as unknown as AppColors) : lightColors;
}
