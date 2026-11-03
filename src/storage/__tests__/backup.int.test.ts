import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Directory, File, Paths, store } from 'expo-file-system';
import { exportBackup, inspectBackup, restoreBackup, InvalidBackupError } from '../backup';
import { readJson, writeJson } from '../fs';

const enc = new TextEncoder();

function freshRoot(name: string): Directory {
  const d = new Directory(Paths.document, name);
  d.delete();
  d.create();
  return d;
}

function put(dir: Directory, path: string, data: string | Uint8Array) {
  const parts = path.split('/');
  let d = dir;
  for (const p of parts.slice(0, -1)) {
    const next = new Directory(d, p);
    if (!next.exists) next.create();
    d = next;
  }
  const f = new File(d, parts[parts.length - 1]);
  store.set(f.uri, { kind: 'file', data: typeof data === 'string' ? enc.encode(data) : data });
}

function bytesAt(dir: Directory, path: string): Uint8Array | null {
  const n = store.get(dir.uri + '/' + path);
  return n?.kind === 'file' ? n.data : null;
}

test('export then restore into an empty folder brings everything back', async () => {
  const src = freshRoot('src');
  const video = Uint8Array.from({ length: 2_000_000 }, (_, i) => (i * 31) % 256);
  await writeJson(src, 'me.json', { version: 1, name: 'عمر', fields: [] });
  await writeJson(new Directory(src, 'رحلة الجسم').exists ? new Directory(src, 'رحلة الجسم') : src.createDirectory('رحلة الجسم'), 'plan.json', { id: 'p1', name: 'رحلة الجسم' });
  put(src, 'رحلة الجسم/attachments/clip.mp4', video);
  put(src, 'رحلة الجسم/attachments/empty.txt', new Uint8Array(0));

  const zip = await exportBackup(src);
  assert.ok(zip.exists);
  const summary = await inspectBackup(zip);
  assert.deepEqual(summary, { hasMe: true, plans: ['رحلة الجسم'], files: 4 });

  const dst = freshRoot('dst');
  await restoreBackup(dst, zip);
  assert.equal((await readJson<{ name: string }>(dst, 'me.json'))?.name, 'عمر');
  assert.ok(bytesAt(dst, 'me.backup.json'), 'restore recreates the backup copy');
  assert.equal((await readJson<{ id: string }>(new Directory(dst, 'رحلة الجسم'), 'plan.json'))?.id, 'p1');
  assert.deepEqual(Buffer.from(bytesAt(dst, 'رحلة الجسم/attachments/clip.mp4')!), Buffer.from(video));
  assert.equal(bytesAt(dst, 'رحلة الجسم/attachments/empty.txt')?.length, 0);
});

test('restore replaces same-named plans, keeps others and drops a renamed copy of a restored plan', async () => {
  const src = freshRoot('src2');
  await writeJson(src.createDirectory('Gym'), 'plan.json', { id: 'gym', name: 'Gym', v: 'backup' });
  const zip = await exportBackup(src);

  const dst = freshRoot('dst2');
  const gym = dst.createDirectory('Gym');
  await writeJson(gym, 'plan.json', { id: 'gym', name: 'Gym', v: 'current' });
  put(dst, 'Gym/attachments/stale.jpg', new Uint8Array([1, 2, 3]));
  await writeJson(dst.createDirectory('Water'), 'plan.json', { id: 'water', name: 'Water' });
  await writeJson(dst.createDirectory('Gym renamed'), 'plan.json', { id: 'gym', name: 'Gym renamed' });

  await restoreBackup(dst, zip);
  assert.equal((await readJson<{ v: string }>(new Directory(dst, 'Gym'), 'plan.json'))?.v, 'backup');
  assert.equal(bytesAt(dst, 'Gym/attachments/stale.jpg'), null, 'old attachments of a restored plan are cleared');
  assert.equal((await readJson<{ id: string }>(new Directory(dst, 'Water'), 'plan.json'))?.id, 'water');
  assert.equal(new Directory(dst, 'Gym renamed').exists, false);
});

test('a zip that is not a backup is refused without touching the folder', async () => {
  const { Zip, ZipDeflate } = await import('fflate');
  const out: Uint8Array[] = [];
  const z = new Zip((_e, d) => out.push(d));
  const e = new ZipDeflate('holiday/photo.txt');
  z.add(e);
  e.push(enc.encode('hello'), true);
  z.end();
  const zipFile = new File(Paths.cache, 'other.zip');
  store.set(zipFile.uri, { kind: 'file', data: Buffer.concat(out) });

  const dst = freshRoot('dst3');
  await writeJson(dst, 'me.json', { name: 'keep' });
  await assert.rejects(restoreBackup(dst, zipFile), InvalidBackupError);
  assert.equal((await readJson<{ name: string }>(dst, 'me.json'))?.name, 'keep');
});
