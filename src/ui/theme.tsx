import { createContext, useContext, type ReactNode } from 'react';
import type { Lang } from '@/model/types';
import { useApp } from '@/state/app';
import { APP_THEME, type Theme } from '@/themes/themes';

const ThemeCtx = createContext<Theme>(APP_THEME);

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

/** Registered natively by the expo-font config plugin with weights 400–900. */
export const ARABIC_FONT = 'Cairo';

const arabicThemes = new Map<string, Theme>();

/**
 * Arabic swaps every theme's fonts for Cairo and drops letter-spacing, italics and uppercase:
 * letter-spacing breaks the joins between Arabic letters, and Arabic has no italic or case.
 */
export function localizeTheme(theme: Theme, lang: Lang): Theme {
  if (lang !== 'ar') return theme;
  let t = arabicThemes.get(theme.id);
  if (!t) {
    t = { ...theme, font: { heading: ARABIC_FONT, body: ARABIC_FONT }, headingItalic: false, uppercase: false, letterSpacing: 0 };
    arabicThemes.set(theme.id, t);
  }
  return t;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeCtx);
  return localizeTheme(theme, useApp().lang);
}

/**
 * Layout direction follows the chosen language, not the native RTL flag, so switching
 * language applies immediately. Screens apply it with the `direction` style.
 */
export function useDir(): { rtl: boolean; direction: 'rtl' | 'ltr' } {
  const rtl = useApp().lang === 'ar';
  return { rtl, direction: rtl ? 'rtl' : 'ltr' };
}

/** Hex colour with alpha, e.g. alpha('#ff0000', 0.2). */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${full}${v}`;
}
