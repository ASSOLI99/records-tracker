// Pure rules for backup archives, kept apart from file I/O so they can be unit-tested.
// A backup is a zip whose entries mirror the record-tracker folder under a top folder of the
// same name: record-tracker/me.json, record-tracker/<Plan>/plan.json, record-tracker/<Plan>/attachments/…

export const BACKUP_TOP = 'record-tracker';

/** File name for a new backup, e.g. "records-tracker-backup-2026-11-03.zip". */
export function backupFileName(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `records-tracker-backup-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.zip`;
}

/** Zip entry name for a file at `segments` inside the record-tracker folder. */
export function entryName(segments: string[]): string {
  return [BACKUP_TOP, ...segments].join('/');
}

/** `.backup.json` copies are rebuilt on restore, so they are left out of the archive. */
export function includeInBackup(fileName: string): boolean {
  return !fileName.endsWith('.backup.json');
}

/** Already-compressed media is stored as-is; text is deflated. */
export function shouldCompress(fileName: string): boolean {
  return /\.(json|txt|md|csv)$/i.test(fileName);
}

/**
 * Turns a zip entry name into path segments inside record-tracker/, or null if the entry must be
 * skipped. Accepts archives with or without the top folder, and rejects anything that could
 * escape the folder ("..", absolute paths, drive letters) or that is a directory entry.
 */
export function parseEntryName(name: string): string[] | null {
  if (!name || name.endsWith('/') || name.includes('\\') || name.startsWith('/') || /^[a-zA-Z]:/.test(name)) return null;
  let parts = name.split('/');
  if (parts[0] === BACKUP_TOP) parts = parts.slice(1);
  if (parts.length === 0 || parts.length > 3) return null;
  for (const p of parts) {
    if (!p || p === '.' || p === '..' || /[\u0000-\u001f:*?"<>|]/.test(p)) return null;
  }
  // macOS archive noise.
  if (parts[0] === '__MACOSX' || parts[parts.length - 1] === '.DS_Store') return null;
  // Allowed shapes: me.json · <Plan>/plan.json · <Plan>/attachments/<file>
  if (parts.length === 1) return parts[0] === 'me.json' ? parts : null;
  if (parts.length === 2) return parts[1] === 'plan.json' ? parts : null;
  return parts[1] === 'attachments' ? parts : null;
}

export interface BackupSummary {
  hasMe: boolean;
  /** Folder names of the plans in the archive. */
  plans: string[];
  files: number;
}

/** What an archive would restore, from its entry names. */
export function summarizeEntries(names: string[]): BackupSummary {
  let hasMe = false;
  let files = 0;
  const plans = new Set<string>();
  for (const n of names) {
    const segs = parseEntryName(n);
    if (!segs) continue;
    files++;
    if (segs.length === 1) hasMe = true;
    else if (segs.length === 2) plans.add(segs[0]);
  }
  return { hasMe, plans: [...plans].sort(), files };
}

/** A usable backup has a profile or at least one plan. */
export function isValidBackup(s: BackupSummary): boolean {
  return s.hasMe || s.plans.length > 0;
}
