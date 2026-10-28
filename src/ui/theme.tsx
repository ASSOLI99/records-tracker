import { createContext, useContext, type ReactNode } from 'react';
import { APP_THEME, type Theme } from '@/themes/themes';

const ThemeCtx = createContext<Theme>(APP_THEME);

export function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeCtx);
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
