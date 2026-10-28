import { Directory, File } from 'expo-file-system';
import type { Attachment, AttachmentKind, Me, Plan } from '@/model/types';
import { safeFolderName, uid } from '@/model/util';
import { copyInto, displayName, ensureDir, findChild, findDir, listEntries, openFile, readJson, writeJson } from './fs';

const ME = 'me.json';
const PLAN = 'plan.json';
const ATTACHMENTS = 'attachments';

export function loadMe(root: Directory): Promise<Me | null> {
  return readJson<Me>(root, ME);
}

export function saveMe(root: Directory, me: Me): Promise<void> {
  return writeJson(root, ME, me);
}

export async function loadPlans(root: Directory): Promise<Plan[]> {
  const plans: Plan[] = [];
  for (const e of listEntries(root)) {
    if (!(e instanceof Directory)) continue;
    const p = await readJson<Plan>(e, PLAN);
    if (p && p.id) plans.push({ ...p, folder: displayName(e) });
  }
  return plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Picks an unused folder name for a new plan: "Name", "Name (2)", … */
export function uniqueFolder(root: Directory, name: string): string {
  const base = safeFolderName(name);
  let candidate = base;
  for (let i = 2; findChild(root, candidate); i++) candidate = `${base} (${i})`;
  return candidate;
}

export async function savePlan(root: Directory, plan: Plan): Promise<void> {
  const dir = ensureDir(root, plan.folder);
  ensureDir(dir, ATTACHMENTS);
  await writeJson(dir, PLAN, plan);
}

/** Deletes the plan's folder, including its attachments. */
export function deletePlanFolder(root: Directory, plan: Plan) {
  const dir = findDir(root, plan.folder);
  if (dir) dir.delete();
}

function kindOf(mime: string | undefined, name: string): AttachmentKind {
  const m = mime ?? '';
  if (m.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(name)) return 'image';
  if (m.startsWith('video/') || /\.(mp4|mov|m4v|3gp|webm|mkv)$/i.test(name)) return 'video';
  return 'file';
}

function extOf(name: string, mime?: string): string {
  const m = /\.([a-z0-9]{1,6})$/i.exec(name);
  if (m) return m[1].toLowerCase();
  if (mime === 'image/jpeg') return 'jpg';
  if (mime?.includes('/')) return mime.split('/')[1].replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
  return 'bin';
}

export interface IncomingFile {
  uri: string;
  name?: string | null;
  mime?: string | null;
  size?: number | null;
}

export async function importAttachment(root: Directory, plan: Plan, src: IncomingFile, fieldId?: string): Promise<Attachment> {
  const dir = ensureDir(ensureDir(root, plan.folder), ATTACHMENTS);
  const originalName = src.name || src.uri.split('/').pop() || 'file';
  const id = uid();
  const file = `${id}.${extOf(originalName, src.mime ?? undefined)}`;
  await copyInto(dir, src.uri, file);
  return {
    id,
    kind: kindOf(src.mime ?? undefined, originalName),
    file,
    originalName,
    mime: src.mime ?? undefined,
    size: src.size ?? undefined,
    fieldId,
    createdAt: new Date().toISOString(),
  };
}

export function attachmentFile(root: Directory, plan: Plan, a: Attachment): File | null {
  const dir = findDir(root, plan.folder);
  const att = dir && findDir(dir, ATTACHMENTS);
  const e = att && findChild(att, a.file);
  return e instanceof File ? e : null;
}

/** File name → URI for every stored attachment of a plan, from one directory listing. */
export function attachmentUris(root: Directory, plan: Plan): Map<string, string> {
  const map = new Map<string, string>();
  const dir = findDir(root, plan.folder);
  const att = dir && findDir(dir, ATTACHMENTS);
  if (att) for (const e of listEntries(att)) map.set(displayName(e), e.uri);
  return map;
}

export function deleteAttachmentFile(root: Directory, plan: Plan, a: Attachment) {
  attachmentFile(root, plan, a)?.delete();
}

export async function openAttachment(root: Directory, plan: Plan, a: Attachment) {
  const f = attachmentFile(root, plan, a);
  if (!f) throw new Error('missing');
  await openFile(f, a.originalName.replace(/[\\/:*?"<>|]/g, '_') || a.file);
}
