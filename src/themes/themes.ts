import { Platform } from 'react-native';
import type { JourneyView } from '@/model/types';

export type NodeShape = 'circle' | 'hex' | 'diamond' | 'shield' | 'leaf' | 'square';

export interface Theme {
  id: string;
  name: { en: string; ar: string };
  tagline: { en: string; ar: string };
  dark: boolean;
  colors: {
    bg: string;
    bg2: string;
    surface: string;
    surface2: string;
    text: string;
    textDim: string;
    primary: string;
    onPrimary: string;
    accent: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
    path: string;
    missed: string;
  };
  radius: number;
  borderWidth: number;
  font: { heading?: string; body?: string };
  headingWeight: '600' | '700' | '800' | '900';
  headingItalic: boolean;
  uppercase: boolean;
  letterSpacing: number;
  node: NodeShape;
  pathDash: number[] | null;
  pathWidth: number;
  /** Icons scattered along the map. */
  decor: string[];
  heroIcon: string;
  streakIcon: string;
  finishIcon: string;
  defaultView: JourneyView;
  glow: boolean;
}

const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const THEMES: Theme[] = [
  {
    id: 'arcade',
    name: { en: 'Neon Arcade', ar: 'أركيد النيون' },
    tagline: { en: 'Gaming — levels, stars and boss stages', ar: 'ألعاب: مراحل ونجوم وزعماء' },
    dark: true,
    colors: {
      bg: '#14072b',
      bg2: '#2b0b4d',
      surface: '#22103f',
      surface2: '#311a58',
      text: '#fdf4ff',
      textDim: '#b9a6d9',
      primary: '#ff2bd6',
      onPrimary: '#14072b',
      accent: '#22e4ff',
      border: '#5b2f96',
      success: '#4dff9a',
      warning: '#ffd23f',
      danger: '#ff4d6d',
      path: '#22e4ff',
      missed: '#4a3a66',
    },
    radius: 14,
    borderWidth: 3,
    font: {},
    headingWeight: '900',
    headingItalic: false,
    uppercase: true,
    letterSpacing: 1,
    node: 'circle',
    pathDash: [10, 8],
    pathWidth: 6,
    decor: ['star-four-points', 'gamepad-variant', 'trophy-variant', 'sword-cross', 'heart', 'diamond-stone', 'controller-classic'],
    heroIcon: 'gamepad-variant',
    streakIcon: 'fire',
    finishIcon: 'trophy',
    defaultView: 'map',
    glow: true,
  },
  {
    id: 'cyber',
    name: { en: 'Cyber Grid', ar: 'الشبكة السيبرانية' },
    tagline: { en: 'Hacker terminal — hex nodes, neon green', ar: 'طرفية الهاكر: عقد سداسية وأخضر نيون' },
    dark: true,
    colors: {
      bg: '#030806',
      bg2: '#06170f',
      surface: '#0a1611',
      surface2: '#0f2219',
      text: '#d6ffe9',
      textDim: '#5fa585',
      primary: '#00ff9c',
      onPrimary: '#021009',
      accent: '#00b3ff',
      border: '#134d33',
      success: '#00ff9c',
      warning: '#ffe14d',
      danger: '#ff3860',
      path: '#00ff9c',
      missed: '#1d3b2d',
    },
    radius: 2,
    borderWidth: 1,
    font: { heading: mono, body: mono },
    headingWeight: '700',
    headingItalic: false,
    uppercase: true,
    letterSpacing: 2,
    node: 'hex',
    pathDash: [2, 6],
    pathWidth: 3,
    decor: ['chip', 'shield-lock-outline', 'console', 'lan', 'access-point', 'code-braces', 'fingerprint'],
    heroIcon: 'console',
    streakIcon: 'lightning-bolt',
    finishIcon: 'shield-check',
    defaultView: 'map',
    glow: true,
  },
  {
    id: 'minimal',
    name: { en: 'Clean Minimal', ar: 'بسيط ونظيف' },
    tagline: { en: 'Simple, calm and easy to read', ar: 'بسيط وهادئ وسهل القراءة' },
    dark: false,
    colors: {
      bg: '#f6f7fb',
      bg2: '#eef1f8',
      surface: '#ffffff',
      surface2: '#f1f3f9',
      text: '#1b2133',
      textDim: '#6b7489',
      primary: '#4f6bff',
      onPrimary: '#ffffff',
      accent: '#14b8a6',
      border: '#e3e7f0',
      success: '#22c55e',
      warning: '#f5b301',
      danger: '#ef4444',
      path: '#c7cfe6',
      missed: '#dfe3ec',
    },
    radius: 18,
    borderWidth: 1,
    font: {},
    headingWeight: '700',
    headingItalic: false,
    uppercase: false,
    letterSpacing: 0,
    node: 'circle',
    pathDash: null,
    pathWidth: 4,
    decor: [],
    heroIcon: 'checkbox-marked-circle-outline',
    streakIcon: 'fire',
    finishIcon: 'flag-checkered',
    defaultView: 'timeline',
    glow: false,
  },
  {
    id: 'fitness',
    name: { en: 'Pulse Fitness', ar: 'نبض اللياقة' },
    tagline: { en: 'Bold and energetic — built for training', ar: 'جريء ومليء بالطاقة: للتمارين' },
    dark: true,
    colors: {
      bg: '#0f1013',
      bg2: '#1f1a17',
      surface: '#1a1b20',
      surface2: '#24262d',
      text: '#fafafa',
      textDim: '#9a9ca6',
      primary: '#ff5a1f',
      onPrimary: '#ffffff',
      accent: '#ffd23f',
      border: '#2f3139',
      success: '#3ee07d',
      warning: '#ffd23f',
      danger: '#ff3b3b',
      path: '#ff5a1f',
      missed: '#34363e',
    },
    radius: 10,
    borderWidth: 2,
    font: {},
    headingWeight: '900',
    headingItalic: true,
    uppercase: true,
    letterSpacing: 0.5,
    node: 'shield',
    pathDash: null,
    pathWidth: 8,
    decor: ['dumbbell', 'run-fast', 'heart-pulse', 'arm-flex', 'bike', 'weight-lifter', 'timer-outline'],
    heroIcon: 'arm-flex',
    streakIcon: 'fire',
    finishIcon: 'medal',
    defaultView: 'map',
    glow: false,
  },
  {
    id: 'zen',
    name: { en: 'Zen Garden', ar: 'حديقة الزن' },
    tagline: { en: 'Soft and mindful — for calm habits', ar: 'ناعم وهادئ: للعادات الهادئة' },
    dark: false,
    colors: {
      bg: '#f3efe6',
      bg2: '#e7efe2',
      surface: '#fbf9f4',
      surface2: '#efe9dc',
      text: '#2f3a2e',
      textDim: '#7b8576',
      primary: '#5b8c5a',
      onPrimary: '#ffffff',
      accent: '#d9a35b',
      border: '#ddd5c4',
      success: '#5b8c5a',
      warning: '#d9a35b',
      danger: '#c0614f',
      path: '#b9c9a8',
      missed: '#e1dccf',
    },
    radius: 24,
    borderWidth: 1,
    font: { heading: serif },
    headingWeight: '600',
    headingItalic: false,
    uppercase: false,
    letterSpacing: 0.2,
    node: 'leaf',
    pathDash: [1, 9],
    pathWidth: 5,
    decor: ['leaf', 'flower-tulip-outline', 'pine-tree', 'spa-outline', 'weather-sunny', 'water-outline', 'sprout-outline'],
    heroIcon: 'spa-outline',
    streakIcon: 'sprout',
    finishIcon: 'flower-tulip',
    defaultView: 'map',
    glow: false,
  },
  {
    id: 'quest',
    name: { en: 'Quest Map', ar: 'خريطة المغامرة' },
    tagline: { en: 'Adventure — parchment map, castles, treasure', ar: 'مغامرة: خريطة قديمة وقلاع وكنوز' },
    dark: false,
    colors: {
      bg: '#efdfb9',
      bg2: '#e2c995',
      surface: '#f7ecd2',
      surface2: '#ead6a8',
      text: '#3e2610',
      textDim: '#7d5a33',
      primary: '#8b3d12',
      onPrimary: '#fbf1da',
      accent: '#c8962e',
      border: '#b48a52',
      success: '#4f7a28',
      warning: '#c8962e',
      danger: '#a3261c',
      path: '#8b5a2b',
      missed: '#cdb488',
    },
    radius: 8,
    borderWidth: 2,
    font: { heading: serif, body: serif },
    headingWeight: '800',
    headingItalic: false,
    uppercase: false,
    letterSpacing: 0.5,
    node: 'diamond',
    pathDash: [12, 10],
    pathWidth: 4,
    decor: ['pine-tree', 'castle', 'sword', 'compass-rose', 'treasure-chest', 'map-legend', 'campfire'],
    heroIcon: 'map-legend',
    streakIcon: 'torch',
    finishIcon: 'treasure-chest',
    defaultView: 'map',
    glow: false,
  },
];

export const APP_THEME = THEMES.find((t) => t.id === 'minimal')!;

export function getTheme(id: string | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? APP_THEME;
}
