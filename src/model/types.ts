// Data model. Everything here is serialised as JSON into the user's record-tracker folder,
// so field names are part of the on-disk format: add fields, never rename them.

export type Lang = 'en' | 'ar';

export interface MeField {
  id: string;
  label: string;
  value: string;
}

export interface Me {
  version: 1;
  name: string;
  fields: MeField[];
  createdAt: string;
  updatedAt: string;
}

// ---------- Triggers ----------

export type TriggerType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'everyNHours'
  | 'timesPerDay'
  | 'weekdays'
  | 'everyNDays'
  | 'manual';

export interface Trigger {
  type: TriggerType;
  /** Time a new step opens (daily, weekly, monthly, yearly, weekdays, everyNDays). */
  hour?: number;
  minute?: number;
  /** weekly: 0 = Sunday … 6 = Saturday */
  weekday?: number;
  /** monthly / yearly: 1–31, clamped to the month's length */
  dayOfMonth?: number;
  /** yearly: 0 = January … 11 = December */
  month?: number;
  /** everyNHours: interval and active window (hours, 0–24) */
  everyHours?: number;
  activeFrom?: number;
  activeTo?: number;
  /** timesPerDay: "HH:mm" */
  times?: string[];
  /** weekdays: 0 = Sunday … 6 = Saturday */
  weekdays?: number[];
  /** everyNDays */
  everyDays?: number;
}

/** A trigger in force from `startAt` until the next segment starts. Old steps keep their segment. */
export interface TriggerSegment {
  id: string;
  startAt: string;
  trigger: Trigger;
}

export interface EndRule {
  type: 'none' | 'steps' | 'date';
  steps?: number;
  /** YYYY-MM-DD */
  date?: string;
}

export interface Reminders {
  /** Notify when a new step opens. */
  onOpen: boolean;
  /** Optional extra daily nudge, "HH:mm". */
  nudge?: string | null;
}

// ---------- Template ----------

export type FieldType = 'mood' | 'text' | 'checklist' | 'number' | 'yesno' | 'photo';

export interface MoodOption {
  id: string;
  label: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface TemplateField {
  id: string;
  type: FieldType;
  label: string;
  moodOptions?: MoodOption[];
  items?: ChecklistItem[];
  unit?: string;
  target?: number;
}

export interface TemplateVersion {
  id: string;
  effectiveFrom: string;
  fields: TemplateField[];
}

// ---------- Steps (records) ----------

export interface FieldValue {
  mood?: string | null;
  text?: string;
  checks?: Record<string, boolean>;
  /** Extra checklist items added for this step only. */
  extraItems?: ChecklistItem[];
  number?: number | null;
  yes?: boolean | null;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export type AttachmentKind = 'image' | 'video' | 'file';

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  /** File name inside the plan's attachments folder. */
  file: string;
  originalName: string;
  mime?: string;
  size?: number;
  fieldId?: string;
  createdAt: string;
}

export interface StepRecord {
  key: string;
  periodStart: string;
  /** Snapshot of the template when this step was first filled. */
  fields: TemplateField[];
  values: Record<string, FieldValue>;
  notes: Note[];
  attachments: Attachment[];
  done?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManualStep {
  id: string;
  at: string;
}

// ---------- Statuses, goals, events ----------

export type StatusDirection = 'higher' | 'lower' | 'match';

export interface StatusHistoryEntry {
  at: string;
  from: string;
  to: string;
}

export interface Status {
  id: string;
  name: string;
  icon?: string | null;
  kind: 'number' | 'text';
  current: string;
  target: string;
  direction: StatusDirection;
  unit?: string;
  /** Main statuses are sorted first; the first three are always shown. */
  main: boolean;
  history: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'epic';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  difficulty: Difficulty;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EventKind = 'status' | 'goal' | 'trigger' | 'template';

export interface JourneyEvent {
  id: string;
  at: string;
  kind: EventKind;
  title: string;
  from?: string;
  to?: string;
  icon?: string | null;
  refId?: string;
}

// ---------- Plan ----------

export type JourneyView = 'map' | 'cards' | 'timeline';

export interface Plan {
  version: 1;
  id: string;
  name: string;
  /** Folder name inside record-tracker/. */
  folder: string;
  themeId: string;
  view: JourneyView;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt?: string | null;
  segments: TriggerSegment[];
  endRule: EndRule;
  reminders: Reminders;
  templates: TemplateVersion[];
  records: Record<string, StepRecord>;
  manualSteps: ManualStep[];
  events: JourneyEvent[];
  statuses: Status[];
  goals: Goal[];
}

/** A step as computed from triggers (it may or may not have a stored record yet). */
export interface Period {
  key: string;
  index: number;
  start: Date;
  end: Date | null;
  triggerType: TriggerType;
}
