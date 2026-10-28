import type { MoodOption, TemplateField } from './types';
import { uid } from './util';
import type { TFn } from '@/i18n';

export type PresetId = 'blank' | 'checkin' | 'fitness' | 'water' | 'habit' | 'focus';

export const MOOD_COLORS = { red: '#ef4444', yellow: '#f5b301', green: '#22c55e' };

export function defaultMoods(labels: { bad: string; ok: string; good: string }): MoodOption[] {
  return [
    { id: uid(), label: labels.bad, color: MOOD_COLORS.red },
    { id: uid(), label: labels.ok, color: MOOD_COLORS.yellow },
    { id: uid(), label: labels.good, color: MOOD_COLORS.green },
  ];
}

const items = (labels: string[]) => labels.map((label) => ({ id: uid(), label }));

type T = TFn;

/** Starter templates. Labels come from the active language at creation time. */
export function presetFields(id: PresetId, t: T): TemplateField[] {
  const moods = defaultMoods({ bad: t('preset.mood.bad'), ok: t('preset.mood.ok'), good: t('preset.mood.good') });
  const mood: TemplateField = { id: uid(), type: 'mood', label: t('preset.mood.label'), moodOptions: moods };
  const thoughts: TemplateField = { id: uid(), type: 'text', label: t('preset.thoughts') };
  switch (id) {
    case 'blank':
      return [];
    case 'checkin':
      return [mood, thoughts];
    case 'fitness':
      return [
        mood,
        thoughts,
        {
          id: uid(),
          type: 'checklist',
          label: t('preset.todo'),
          items: items([t('preset.fitness.water'), t('preset.fitness.steps'), t('preset.fitness.junk'), t('preset.fitness.workout')]),
        },
        { id: uid(), type: 'photo', label: t('preset.fitness.photo') },
      ];
    case 'water':
      return [
        { id: uid(), type: 'number', label: t('preset.water.glasses'), unit: t('preset.water.unit'), target: 8 },
        { id: uid(), type: 'yesno', label: t('preset.water.goal') },
      ];
    case 'habit':
      return [
        { id: uid(), type: 'yesno', label: t('preset.habit.did') },
        mood,
        { id: uid(), type: 'text', label: t('preset.habit.trigger') },
      ];
    case 'focus':
      return [
        { id: uid(), type: 'number', label: t('preset.focus.minutes'), unit: t('preset.focus.unit'), target: 120 },
        { id: uid(), type: 'checklist', label: t('preset.focus.tasks'), items: items([t('preset.focus.task1'), t('preset.focus.task2'), t('preset.focus.task3')]) },
        { id: uid(), type: 'text', label: t('preset.focus.learned') },
      ];
  }
}

export const PRESETS: { id: PresetId; icon: string }[] = [
  { id: 'checkin', icon: 'emoticon-happy-outline' },
  { id: 'fitness', icon: 'dumbbell' },
  { id: 'water', icon: 'cup-water' },
  { id: 'habit', icon: 'repeat' },
  { id: 'focus', icon: 'target' },
  { id: 'blank', icon: 'file-outline' },
];
