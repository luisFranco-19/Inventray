import React, { createContext, useContext, useState, useMemo, useEffect, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { light, dark, type ThemeColors } from '../theme';

// ─── Tipo del contexto ────────────────────────────────────────────────────────

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType>({
  colors: light,
  isDark: false,
  toggleTheme: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children?: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const storedDark = await AsyncStorage.getItem('@theme_is_dark');
      if (storedDark !== null) setIsDark(storedDark === 'true');
    };
    loadSettings();
  }, []);

  const toggleTheme = async () => {
    const newVal = !isDark;
    setIsDark(newVal);
    await AsyncStorage.setItem('@theme_is_dark', String(newVal));
  };

  const value = useMemo<ThemeContextType>(
    () => ({
      colors: isDark ? dark : light,
      isDark,
      toggleTheme,
    }),
    [isDark]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}
