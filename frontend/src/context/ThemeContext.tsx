import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'theme-white' | 'theme-pearl' | 'theme-sand' | 'theme-lavender' | 'theme-dark';

interface ThemeContextType {
  theme: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'theme-white',
  setThemeMode: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>('theme-white');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('smartattend_theme_mode') as ThemeMode) || 'theme-white';
    applyThemeClass(savedTheme);
    setTheme(savedTheme);
  }, []);

  const applyThemeClass = (newTheme: ThemeMode) => {
    const root = document.documentElement;
    const body = document.body;

    const allThemes: ThemeMode[] = ['theme-white', 'theme-pearl', 'theme-sand', 'theme-lavender', 'theme-dark'];

    allThemes.forEach((t) => {
      root.classList.remove(t);
      body.classList.remove(t);
    });
    root.classList.remove('dark', 'light');
    body.classList.remove('dark', 'light');

    root.classList.add(newTheme);
    body.classList.add(newTheme);

    if (newTheme === 'theme-dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.add('light');
      body.classList.add('light');
    }
  };

  const setThemeMode = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem('smartattend_theme_mode', newTheme);
    applyThemeClass(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
