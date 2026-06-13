'use client';

/**
 * ThemeProvider — single source of truth for the app theme.
 *
 *   'dark'   → Synthwave Night   (<html class="dark">)
 *   'bright' → Synthwave Neon Bright (<html class="theme-bright">)
 *
 * Persisted in localStorage('seedguard_theme'). A tiny inline script in
 * app/layout.tsx applies the class before hydration so there is no flash.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'bright';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'theme-bright');
  root.classList.add(theme === 'dark' ? 'dark' : 'theme-bright');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  // Read persisted theme once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('seedguard_theme');
      const initial: Theme = saved === 'bright' ? 'bright' : 'dark';
      setThemeState(initial);
      applyThemeClass(initial);
    } catch {
      /* localStorage unavailable — keep dark */
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem('seedguard_theme', t);
    } catch {}
    applyThemeClass(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'bright' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
