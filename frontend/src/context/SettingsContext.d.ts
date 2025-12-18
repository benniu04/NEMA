import React from 'react';

export interface SettingsContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

export function useSettings(): SettingsContextType;

export const SettingsProvider: React.FC<{ children: React.ReactNode }>;

