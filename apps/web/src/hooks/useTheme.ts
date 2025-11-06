import { useEffect, useState } from 'react';
import { storage } from '../api/http';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const user = storage.getUser();
    const userTheme = (user?.theme as Theme) || 'system';
    setTheme(userTheme);
    applyTheme(userTheme);
  }, []);

  useEffect(() => {
    const handleUserSettingsUpdate = (e: any) => {
      const updatedUser = e.detail;
      if (updatedUser?.theme) {
        setTheme(updatedUser.theme);
        applyTheme(updatedUser.theme);
      }
    };

    window.addEventListener('user-settings-updated', handleUserSettingsUpdate);
    return () => window.removeEventListener('user-settings-updated', handleUserSettingsUpdate);
  }, []);

  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return { theme };
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}
