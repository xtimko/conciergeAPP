import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  setTheme: (_t) => {},
  lang: 'ru',
  setLang: (_l) => {},
});

function applyTelegramChrome(isDark) {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  if (!tg) return;
  if (isDark) {
    tg.setHeaderColor?.('#000000');
    tg.setBackgroundColor?.('#000000');
    tg.setBottomBarColor?.('#000000');
  } else {
    tg.setHeaderColor?.('#ffffff');
    tg.setBackgroundColor?.('#ffffff');
    tg.setBottomBarColor?.('#ffffff');
  }
}

function applyMetaThemeColor(isDark) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', isDark ? '#000000' : '#ffffff');
}

export function ThemeProvider({ children, initialTheme = 'dark', initialLang = 'ru' }) {
  const [theme, setThemeState] = useState(initialTheme === 'light' ? 'light' : 'dark');
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    setThemeState(initialTheme === 'light' ? 'light' : 'dark');
  }, [initialTheme]);

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    applyMetaThemeColor(isDark);
    applyTelegramChrome(isDark);
  }, [theme]);

  const setTheme = (t) => setThemeState(t === 'light' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, lang, setLang }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
