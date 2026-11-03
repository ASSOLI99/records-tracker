import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough, strFromU8, strToU8 } from 'fflate';
import { backupFileName, entryName, includeInBackup, isValidBackup, parseEntryName, shouldCompress, summarizeEntries } from '../backup';

test('backup file name carries the local date', () => {
  assert.equal(backupFileName(new Date(2026, 10, 3, 23, 59)), 'records-tracker-backup-2026-11-03.zip');
});

test('entry names sit under the record-tracker top folder', () => {
  assert.equal(entryName(['me.json']), 'record-tracker/me.json');
  assert.equal(entryName(['Plan', 'attachments', 'a.jpg']), 'record-tracker/Plan/attachments/a.jpg');
});

test('backup copies are left out, text is compressed, media is stored', () => {
  assert.equal(includeInBackup('plan.backup.json'), false);
  assert.equal(includeInBackup('plan.json'), true);
  assert.equal(shouldCompress('plan.json'), true);
  assert.equal(shouldCompress('clip.mp4'), false);
  assert.equal(shouldCompress('photo.JPG'), false);
});

test('entry names are parsed with or without the top folder', () => {
  assert.deepEqual(parseEntryName('record-tracker/me.json'), ['me.json']);
  assert.deepEqual(parseEntryName('me.json'), ['me.json']);
  assert.deepEqual(parseEntryName('رحلة الجسم/plan.json'), ['رحلة الجسم', 'plan.json']);
  assert.deepEqual(parseEntryName('record-tracker/Gym/attachments/x.jpg'), ['Gym', 'attachments', 'x.jpg']);
});

test('entries that could escape the folder or are not app files are rejected', () => {
  for (const bad of [
    '../me.json',
    'record-tracker/../../etc/passwd',
    '/me.json',
    'C:/me.json',
    'record-tracker\\me.json',
    'record-tracker/Gym/',
    'record-tracker/Gym/notes.txt',
    'record-tracker/Gym/attachments/a/b.jpg',
    'record-tracker/other.json',
    '__MACOSX/record-tracker/me.json',
    'record-tracker/Gym/attachments/.DS_Store',
  ]) {
    assert.equal(parseEntryName(bad), null, bad);
  }
});

test('summary lists the profile and plan folders', () => {
  const s = summarizeEntries(['record-tracker/me.json', 'record-tracker/B/plan.json', 'record-tracker/A/plan.json', 'record-tracker/A/attachments/1.jpg', 'junk.txt']);
  assert.deepEqual(s, { hasMe: true, plans: ['A', 'B'], files: 4 });
  assert.equal(isValidBackup(s), true);
  assert.equal(isValidBackup(summarizeEntries(['photo.jpg', 'notes/x.txt'])), false);
});

/** Same streaming calls as src/storage/backup.ts, with Buffers instead of files. */
function makeZip(files: Record<string, Uint8Array>): Uint8Array {
  const out: Uint8Array[] = [];
  const zip = new Zip((err, d) => {
    if (err) throw err;
    out.push(d);
  });
  for (const [path, data] of Object.entries(files)) {
    const name = entryName(path.split('/'));
    const e = shouldCompress(name) ? new ZipDeflate(name, { level: 6 }) : new ZipPassThrough(name);
    zip.add(e);
    for (let i = 0; i < data.length; i += 1000) e.push(data.subarray(i, i + 1000), false);
    e.push(new Uint8Array(0), true);
  }
  zip.end();
  return Buffer.concat(out);
}

function readZip(bytes: Uint8Array): Record<string, Uint8Array> {
  const got: Record<string, Uint8Array[]> = {};
  const uz = new Unzip((f) => {
    const segs = parseEntryName(f.name);
    if (!segs) return;
    const key = segs.join('/');
    got[key] = [];
    f.ondata = (err, d) => {
      if (err) throw err;
      got[key].push(d);
    };
    f.start();
  });
  uz.register(UnzipInflate);
  for (let i = 0; i < bytes.length; i += 4096) uz.push(bytes.subarray(i, i + 4096), false);
  uz.push(new Uint8Array(0), true);
  return Object.fromEntries(Object.entries(got).map(([k, v]) => [k, Buffer.concat(v)]));
}

test('a backup round-trips text and binary files, including Arabic names', () => {
  const photo = Uint8Array.from({ length: 50_000 }, (_, i) => (i * 7) % 256);
  const files = {
    'me.json': strToU8(JSON.stringify({ version: 1, name: 'عمر' })),
    'رحلة الجسم/plan.json': strToU8(JSON.stringify({ id: 'p1', name: 'رحلة الجسم' })),
    'رحلة الجسم/attachments/a.jpg': photo,
    'Empty/attachments/zero.bin': new Uint8Array(0),
  };
  const back = readZip(makeZip(files));
  assert.deepEqual(Object.keys(back).sort(), Object.keys(files).sort());
  assert.equal(JSON.parse(strFromU8(back['me.json'])).name, 'عمر');
  assert.deepEqual(Buffer.from(back['رحلة الجسم/attachments/a.jpg']), Buffer.from(photo));
  assert.equal(back['Empty/attachments/zero.bin'].length, 0);
});

test('a backup opens with the standard unzip tool', (t) => {
  let hasUnzip = true;
  try {
    execFileSync('unzip', ['-v'], { stdio: 'ignore' });
  } catch {
    hasUnzip = false;
  }
  if (!hasUnzip) return t.skip('unzip not installed');
  const dir = mkdtempSync(join(tmpdir(), 'rt-backup-'));
  const zipPath = join(dir, 'b.zip');
  writeFileSync(zipPath, makeZip({ 'me.json': strToU8('{"name":"x"}'), 'P/attachments/a.bin': new Uint8Array(3000).fill(9) }));
  execFileSync('unzip', ['-tq', zipPath]);
});
