import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ALL_ICONS: string[] = Object.keys(MaterialCommunityIcons.glyphMap);

export function isIcon(name: string | null | undefined): name is string {
  return !!name && name in MaterialCommunityIcons.glyphMap;
}

/** Common picks shown before the user searches. */
export const POPULAR_ICONS = [
  'scale-bathroom', 'cup-water', 'run', 'walk', 'dumbbell', 'heart-pulse', 'sleep', 'food-apple',
  'book-open-variant', 'brain', 'meditation', 'smoking-off', 'cash', 'piggy-bank', 'briefcase',
  'school', 'translate', 'guitar-acoustic', 'code-tags', 'pill', 'tooth', 'water', 'fire',
  'emoticon-happy-outline', 'star', 'trophy', 'target', 'timer-outline', 'calendar-check',
  'ruler', 'tape-measure', 'human', 'bike', 'swim', 'yoga', 'weight-lifter', 'coffee-off',
  'phone-off', 'television-off', 'leaf', 'flower', 'home', 'account-group', 'mosque', 'hands-pray',
  'car', 'airplane', 'camera', 'palette', 'music', 'gamepad-variant', 'chart-line',
];

// Arabic search words mapped to the English words icon names are made of.
const AR_SYNONYMS: Record<string, string> = {
  ماء: 'water', مياه: 'water', وزن: 'scale', رياضة: 'run', جري: 'run', مشي: 'walk', نوم: 'sleep',
  طعام: 'food', أكل: 'food', قلب: 'heart', كتاب: 'book', قراءة: 'book', دراسة: 'school', مال: 'cash',
  عمل: 'briefcase', صلاة: 'pray', مسجد: 'mosque', قرآن: 'book', تدخين: 'smoking', قهوة: 'coffee',
  هاتف: 'phone', نجمة: 'star', هدف: 'target', وقت: 'timer', تقويم: 'calendar', سعادة: 'happy',
  حزن: 'sad', دواء: 'pill', سن: 'tooth', نار: 'fire', شجرة: 'tree', ورقة: 'leaf', زهرة: 'flower',
  بيت: 'home', سيارة: 'car', سفر: 'airplane', كاميرا: 'camera', موسيقى: 'music', لعبة: 'gamepad',
  سباحة: 'swim', دراجة: 'bike', يوغا: 'yoga', تأمل: 'meditation', عقل: 'brain', لغة: 'translate',
  برمجة: 'code', طول: 'ruler', قياس: 'tape', كأس: 'trophy', رسم: 'palette', عائلة: 'account-group',
};

export function searchIcons(query: string, limit = 600): string[] {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => AR_SYNONYMS[w] ?? w);
  if (!terms.length) return POPULAR_ICONS;
  const out: string[] = [];
  const exactFirst: string[] = [];
  for (const name of ALL_ICONS) {
    if (terms.every((t) => name.includes(t))) {
      if (name.split('-').includes(terms[0])) exactFirst.push(name);
      else out.push(name);
    }
    if (exactFirst.length + out.length >= limit) break;
  }
  return [...exactFirst, ...out];
}
