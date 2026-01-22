import { useCallback, useEffect, useState } from 'react';

export const useDarkMode = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('theme:v1') ?? localStorage.getItem('theme');
      if (stored) {
        return stored === 'dark';
      }
    } catch {
      void 0;
    }
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      try {
        localStorage.setItem('theme:v1', 'dark');
        localStorage.setItem('theme', 'dark');
      } catch {
        void 0;
      }
    } else {
      root.classList.remove('dark');
      try {
        localStorage.setItem('theme:v1', 'light');
        localStorage.setItem('theme', 'light');
      } catch {
        void 0;
      }
    }
  }, [isDark]);

  const toggleDarkMode = useCallback(() => setIsDark((prev) => !prev), []);

  return { isDark, toggleDarkMode };
};
