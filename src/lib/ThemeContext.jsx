import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  lang: 'ru',
  setLang: () => {},
});

export function ThemeProvider({ children, initialTheme = 'dark', initialLang = 'ru' }) {
  const [theme, setTheme] = useState(initialTheme);
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, lang, setLang }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}