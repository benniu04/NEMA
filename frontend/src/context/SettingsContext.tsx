import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Type definitions
interface ThemeColors {
  background: string;
  text: string;
  accent: string;
}

interface Theme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export type ThemeKey = 'dark' | 'light' | 'midnight' | 'cinema';
export type LanguageKey = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'pt';

interface SettingsContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
  themes: Record<ThemeKey, Theme>;
  currentTheme: Theme;
  language: LanguageKey;
  setLanguage: (lang: LanguageKey) => void;
  languages: Record<LanguageKey, Language>;
  currentLanguage: Language;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Available themes
export const themes: Record<ThemeKey, Theme> = {
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark theme',
    colors: {
      background: 'bg-black',
      text: 'text-white',
      accent: 'amber'
    }
  },
  light: {
    id: 'light',
    name: 'Light',
    description: 'Light mode theme',
    colors: {
      background: 'bg-white',
      text: 'text-gray-900',
      accent: 'amber'
    }
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep blue dark theme',
    colors: {
      background: 'bg-slate-950',
      text: 'text-white',
      accent: 'blue'
    }
  },
  cinema: {
    id: 'cinema',
    name: 'Cinema',
    description: 'Classic cinema red accent',
    colors: {
      background: 'bg-neutral-950',
      text: 'text-white',
      accent: 'red'
    }
  }
};

// Available languages
export const languages: Record<LanguageKey, Language> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸'
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷'
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪'
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳'
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵'
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷'
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷'
  }
};

// Import translations from separate file to keep this file manageable
import { translations } from './translations';

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const saved = localStorage.getItem('theme');
    return saved && saved in themes ? (saved as ThemeKey) : 'dark';
  });

  const [language, setLanguageState] = useState<LanguageKey>(() => {
    const saved = localStorage.getItem('language');
    return saved && saved in languages ? (saved as LanguageKey) : 'en';
  });

  // Apply theme to document
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    // Apply theme class to body
    document.body.className = '';

    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setTheme = (newTheme: ThemeKey): void => {
    if (newTheme in themes) {
      setThemeState(newTheme);
    }
  };

  const setLanguage = (newLanguage: LanguageKey): void => {
    if (newLanguage in languages) {
      setLanguageState(newLanguage);
    }
  };

  // Translation function
  const t = (key: string): string => {
    const langTranslations = translations[language] || translations.en;
    return langTranslations[key] || translations.en[key] || key;
  };

  const value: SettingsContextType = {
    theme,
    setTheme,
    themes,
    currentTheme: themes[theme],
    language,
    setLanguage,
    languages,
    currentLanguage: languages[language],
    t
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
