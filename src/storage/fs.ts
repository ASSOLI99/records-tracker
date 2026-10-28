// Storage layer. All user data lives in one visible folder named `record-tracker`:
//   Android: inside a folder the user picks (Storage Access Framework, no broad storage permission).
//   iOS: the app's Documents folder, which the Files app shows under "On My iPhone".
// SAF directories are addressed by content:// URIs, so children are found by listing, not by
// joining paths, and SAF writes are done to freshly created files (its "w" mode does not
// reliably truncate, and SAF has no rename).
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { TFn } from '@/i18n';
import type { Lang } from '@/model/types';

export const ROOT_NAME = 'record-tracker';

export interface AppConfig {
  rootUri?: string | null;
  lang?: Lang | null;
}

const configFile = () => new File(Paths.document, 'app-config.json');

export function readConfig(): AppConfig {
  try {
    const f = configFile();
    if (!f.exists) return {};
    return JSON.parse(f.textSync()) as AppConfig;
  } catch {
    return {};
  }
}

export function writeConfig(patch: Partial<AppConfig>): AppConfig {
  const next = { ...readConfig(), ...patch };
  const f = configFile();
  if (f.exists) f.delete();
  f.create();
  f.writeSync(JSON.stringify(next));
  return next;
}

export type Entry = Directory | File;

function isSaf(uri: string): boolean {
  return uri.startsWith('content://');
}

/** Human file name of an entry, decoding SAF document ids like "primary:Documents/record-tracker". */
export function displayName(e: Entry): string {
  if (!isSaf(e.uri)) return e.name;
  const last = e.uri.replace(/\/+$/, '').split('/').pop() ?? '';
  let decoded = last;
  try {
    decoded = decodeURIComponent(last);
  } catch {}
  const afterSlash = decoded.split('/').pop() ?? decoded;
  return afterSlash.includes(':') ? afterSlash.slice(afterSlash.lastIndexOf(':') + 1) : afterSlash;
}

export function listEntries(dir: Directory): Entry[] {
  try {
    return dir.list();
  } catch {
    return [];
  }
}

export function findChild(dir: Directory, name: string): Entry | null {
  if (!isSaf(dir.uri)) {
    try {
      const d = new Directory(dir, name);
      if (d.exists) return d;
    } catch {}
    try {
      const f = new File(dir, name);
      if (f.exists) return f;
    } catch {}
    return null;
  }
  return listEntries(dir).find((e) => displayName(e) === name) ?? null;
}

export function findDir(dir: Directory, name: string): Directory | null {
  const e = findChild(dir, name);
  return e instanceof Directory ? e : null;
}

export function ensureDir(parent: Directory, name: string): Directory {
  const existing = findDir(parent, name);
  if (existing) return existing;
  if (isSaf(parent.uri)) return parent.createDirectory(name);
  const d = new Directory(parent, name);
  d.create({ intermediates: true, idempotent: true });
  return d;
}

export function deleteChild(dir: Directory, name: string) {
  const e = findChild(dir, name);
  if (e) e.delete();
}

async function writeFresh(dir: Directory, name: string, mime: string, text: string) {
  deleteChild(dir, name);
  const f = dir.createFile(name, mime);
  await f.write(text);
}

// Serialise writes per file so overlapping saves can't interleave delete/create.
const queues = new Map<string, Promise<unknown>>();
function enqueue<T>(key: string, job: () => Promise<T>): Promise<T> {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(job);
  queues.set(key, next);
  return next;
}

const backupName = (name: string) => name.replace(/\.json$/, '') + '.backup.json';

/**
 * Writes the backup copy first, then the main file, so at any moment at least one
 * complete copy exists on disk even if the app is killed mid-write.
 */
export function writeJson(dir: Directory, name: string, data: unknown): Promise<void> {
  const text = JSON.stringify(data, null, 2);
  return enqueue(dir.uri + '/' + name, async () => {
    await writeFresh(dir, backupName(name), 'application/json', text);
    await writeFresh(dir, name, 'application/json', text);
  });
}

export async function readJson<T>(dir: Directory, name: string): Promise<T | null> {
  for (const candidate of [name, backupName(name)]) {
    const e = findChild(dir, candidate);
    if (e instanceof File) {
      try {
        return JSON.parse(await e.text()) as T;
      } catch {}
    }
  }
  return null;
}

/** Copies a picked file (file:// or content://) into `dir` under a new unique name. */
export async function copyInto(dir: Directory, sourceUri: string, name: string): Promise<void> {
  // Stage under the final name in the cache, then copy into the folder: copying into a
  // directory keeps the source name, which works the same for file:// and SAF targets.
  const staging = new Directory(Paths.cache, 'incoming');
  staging.create({ intermediates: true, idempotent: true });
  const staged = new File(staging, name);
  if (staged.exists) staged.delete();
  await new File(sourceUri).copy(staged);
  try {
    await staged.copy(dir);
  } finally {
    if (staged.exists) staged.delete();
  }
}

/** Opens a stored file in the system viewer (Quick Look on iOS, an app chooser on Android). */
export async function openFile(file: File, name: string): Promise<void> {
  try {
    await file.preview();
    return;
  } catch {}
  const local = await cacheCopy(file, name);
  await local.preview();
}

/** A shareable/openable local copy of a stored file (SAF content URIs can't be shared directly). */
export async function cacheCopy(file: File, name: string): Promise<File> {
  const dir = new Directory(Paths.cache, 'share');
  dir.create({ intermediates: true, idempotent: true });
  const dest = new File(dir, name);
  if (dest.exists) dest.delete();
  await file.copy(dest);
  return dest;
}

// ---------- Root folder ----------

export const usesFolderPicker = Platform.OS === 'android';

/** The record-tracker folder, if it is set up and still accessible. */
export function resolveRoot(): Directory | null {
  if (!usesFolderPicker) {
    try {
      const d = new Directory(Paths.document, ROOT_NAME);
      d.create({ intermediates: true, idempotent: true });
      return d;
    } catch {
      return null;
    }
  }
  const { rootUri } = readConfig();
  if (!rootUri) return null;
  try {
    const d = new Directory(rootUri);
    if (!d.exists) return null;
    d.list(); // throws if the folder permission was revoked
    return d;
  } catch {
    return null;
  }
}

/**
 * Android: lets the user pick a folder. If it already is (or contains) a record-tracker folder,
 * that one is used, which is how restore from a backup works. Otherwise one is created inside.
 */
export async function pickRoot(): Promise<{ root: Directory; existing: boolean } | null> {
  let picked: Directory;
  try {
    picked = await Directory.pickDirectoryAsync();
  } catch {
    return null;
  }
  if (!picked?.uri) return null;
  let root: Directory;
  if (findChild(picked, 'me.json') || displayName(picked) === ROOT_NAME) {
    root = picked;
  } else {
    root = ensureDir(picked, ROOT_NAME);
  }
  const existing = !!findChild(root, 'me.json');
  writeConfig({ rootUri: root.uri });
  return { root, existing };
}

/** Readable location of the root for display. */
export function describeRoot(root: Directory | null, t: TFn): string {
  if (!root) return '—';
  if (!usesFolderPicker) return `${t('storage.ios')} › ${ROOT_NAME}`;
  const last = root.uri.replace(/\/+$/, '').split('/').pop() ?? '';
  try {
    const id = decodeURIComponent(last);
    const [volume, path] = id.split(':');
    return `${volume === 'primary' ? t('storage.internal') : volume} › ${(path ?? '').split('/').join(' › ')}`;
  } catch {
    return root.uri;
  }
}
