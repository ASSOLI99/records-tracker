// One-file backups: the whole record-tracker folder in a single .zip, and restoring from one.
// Files are streamed in chunks through fflate, so large videos never sit in memory whole.
import { Directory, File, FileMode, Paths } from 'expo-file-system';
import { Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough, strFromU8 } from 'fflate';
import { backupFileName, entryName, includeInBackup, isValidBackup, parseEntryName, shouldCompress, summarizeEntries, type BackupSummary } from '@/model/backup';
import { deleteChild, displayName, ensureDir, findChild, listEntries, readJson, writeJson } from './fs';

const CHUNK = 512 * 1024;

/** Every file under `dir`, with its path segments relative to `dir`. */
function walk(dir: Directory, prefix: string[] = []): { file: File; segments: string[] }[] {
  const out: { file: File; segments: string[] }[] = [];
  for (const e of listEntries(dir)) {
    const name = displayName(e);
    if (e instanceof Directory) out.push(...walk(e, [...prefix, name]));
    else if (includeInBackup(name)) out.push({ file: e, segments: [...prefix, name] });
  }
  return out;
}

/**
 * Reads a file in chunks, handing each to `onChunk`, then an empty chunk with `final` set.
 * Reads until the handle returns nothing, so it doesn't depend on a reported size (SAF files
 * don't always have one).
 */
async function readChunks(file: File, onChunk: (chunk: Uint8Array, final: boolean) => void) {
  const handle = file.open(FileMode.ReadOnly);
  try {
    for (;;) {
      const chunk = await handle.readBytes(CHUNK);
      if (chunk.length === 0) break;
      onChunk(chunk, false);
    }
    onChunk(new Uint8Array(0), true);
  } finally {
    handle.close();
  }
}

/**
 * Writes the whole record-tracker folder to a zip in the app's cache and returns it, ready to
 * share. `.backup.json` copies are skipped; restore recreates them.
 */
export async function exportBackup(root: Directory, onProgress?: (done: number, total: number) => void): Promise<File> {
  const dir = new Directory(Paths.cache, 'backup');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true, idempotent: true });
  const out = new File(dir, backupFileName());
  out.create();
  const handle = out.open(FileMode.WriteOnly);
  let error: Error | null = null;
  try {
    const zip = new Zip((err, data) => {
      if (err) error = err;
      else if (data.length) handle.writeBytesSync(data);
    });
    const files = walk(root);
    for (let i = 0; i < files.length; i++) {
      const { file, segments } = files[i];
      const name = entryName(segments);
      const entry = shouldCompress(name) ? new ZipDeflate(name, { level: 6 }) : new ZipPassThrough(name);
      zip.add(entry);
      await readChunks(file, (chunk, final) => entry.push(chunk, final));
      if (error) throw error;
      onProgress?.(i + 1, files.length);
    }
    zip.end();
    if (error) throw error;
  } finally {
    handle.close();
  }
  return out;
}

/** Streams a zip through fflate. `onFile` decides per entry whether to read it and where data goes. */
async function readZip(
  zipFile: File,
  onFile: (name: string) => ((chunk: Uint8Array, final: boolean) => void) | null,
): Promise<void> {
  let error: Error | null = null;
  const unzip = new Unzip((f) => {
    const sink = onFile(f.name);
    if (!sink) return;
    f.ondata = (err, data, final) => {
      if (err) error = err;
      else sink(data, final);
    };
    f.start();
  });
  unzip.register(UnzipInflate);
  await readChunks(zipFile, (chunk, final) => {
    if (!error) unzip.push(chunk, final);
  });
  if (error) throw error;
}

/** Lists what a backup would restore, without writing anything. */
export async function inspectBackup(zipFile: File): Promise<BackupSummary> {
  const names: string[] = [];
  await readZip(zipFile, (name) => {
    names.push(name);
    return null;
  });
  return summarizeEntries(names);
}

export class InvalidBackupError extends Error {}

/**
 * Restores a backup into `root`. Plans in the backup replace plans in folders with the same name;
 * other plans are kept. The profile (me.json) is replaced when the backup has one.
 */
export async function restoreBackup(root: Directory, zipFile: File): Promise<BackupSummary> {
  const summary = await inspectBackup(zipFile);
  if (!isValidBackup(summary)) throw new InvalidBackupError('not a Records Tracker backup');

  // Clear the plan folders being restored so no stale attachments are left behind.
  for (const plan of summary.plans) {
    const existing = findChild(root, plan);
    if (existing instanceof Directory) existing.delete();
  }

  // JSON is collected and written with writeJson (backup copy first, then main file);
  // attachments are streamed straight to their destination.
  const json: { dir: Directory; name: string; parts: Uint8Array[] }[] = [];
  await readZip(zipFile, (rawName) => {
    const segs = parseEntryName(rawName);
    if (!segs) return null;
    let dir = root;
    for (const s of segs.slice(0, -1)) dir = ensureDir(dir, s);
    const name = segs[segs.length - 1];
    if (name.endsWith('.json')) {
      const item = { dir, name, parts: [] as Uint8Array[] };
      json.push(item);
      return (chunk) => {
        if (chunk.length) item.parts.push(chunk);
      };
    }
    deleteChild(dir, name);
    const target = dir.createFile(name, null);
    const handle = target.open(FileMode.WriteOnly);
    return (chunk, final) => {
      if (chunk.length) handle.writeBytesSync(chunk);
      if (final) handle.close();
    };
  });

  const restoredIds = new Set<string>();
  for (const { dir, name, parts } of json) {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const bytes = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      bytes.set(p, off);
      off += p.length;
    }
    let data: unknown;
    try {
      data = JSON.parse(strFromU8(bytes));
    } catch {
      continue; // A damaged JSON file is skipped rather than written over good data.
    }
    await writeJson(dir, name, data);
    const id = name === 'plan.json' ? (data as { id?: unknown })?.id : null;
    if (typeof id === 'string') restoredIds.add(id);
  }

  // A restored plan may live under a different folder name here (it was renamed since the
  // backup). Two folders with one plan id would show the plan twice, so the older copy goes.
  const restoredFolders = new Set(summary.plans);
  for (const e of listEntries(root)) {
    if (!(e instanceof Directory) || restoredFolders.has(displayName(e))) continue;
    const p = await readJson<{ id?: string }>(e, 'plan.json');
    if (p?.id && restoredIds.has(p.id)) e.delete();
  }
  return summary;
}
