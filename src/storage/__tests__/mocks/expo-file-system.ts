// In-memory stand-in for expo-file-system, enough for src/storage/fs.ts and backup.ts.
type Node = { kind: 'dir' } | { kind: 'file'; data: Uint8Array };
export const store = new Map<string, Node>();
const join = (a: string, b: string) => a.replace(/\/+$/, '') + '/' + b;
const nameOf = (u: string) => u.replace(/\/+$/, '').split('/').pop() ?? '';
const uriOf = (p: unknown, name?: string) => {
  const base = typeof p === 'string' ? p : (p as { uri: string }).uri;
  return name ? join(base, name) : base;
};
const enc = new TextEncoder();
const dec = new TextDecoder();

export enum FileMode {
  ReadWrite = 'rw',
  ReadOnly = 'r',
  WriteOnly = 'w',
  Append = 'wa',
  Truncate = 'wt',
}

class Handle {
  offset = 0;
  constructor(private file: File, private mode: FileMode) {
    if (mode === FileMode.WriteOnly || mode === FileMode.Truncate) store.set(file.uri, { kind: 'file', data: new Uint8Array(0) });
  }
  get size() {
    return this.file.size;
  }
  private data() {
    const n = store.get(this.file.uri);
    if (n?.kind !== 'file') throw new Error('missing ' + this.file.uri);
    return n.data;
  }
  async readBytes(len: number) {
    const d = this.data().slice(this.offset, this.offset + len);
    this.offset += d.length;
    return d;
  }
  writeBytesSync(bytes: Uint8Array) {
    const d = this.data();
    const next = new Uint8Array(d.length + bytes.length);
    next.set(d);
    next.set(bytes, d.length);
    store.set(this.file.uri, { kind: 'file', data: next });
  }
  async writeBytes(bytes: Uint8Array) {
    this.writeBytesSync(bytes);
  }
  close() {}
}

export class File {
  uri: string;
  constructor(p: unknown, name?: string) {
    this.uri = uriOf(p, name);
  }
  get name() {
    return nameOf(this.uri);
  }
  get exists() {
    return store.get(this.uri)?.kind === 'file';
  }
  get size() {
    const n = store.get(this.uri);
    return n?.kind === 'file' ? n.data.length : 0;
  }
  create() {
    store.set(this.uri, { kind: 'file', data: new Uint8Array(0) });
  }
  delete() {
    store.delete(this.uri);
  }
  open(mode: FileMode = FileMode.ReadWrite) {
    return new Handle(this, mode);
  }
  textSync() {
    const n = store.get(this.uri);
    if (n?.kind !== 'file') throw new Error('missing');
    return dec.decode(n.data);
  }
  async text() {
    return this.textSync();
  }
  writeSync(t: string) {
    store.set(this.uri, { kind: 'file', data: enc.encode(t) });
  }
  async write(t: string | Uint8Array) {
    store.set(this.uri, { kind: 'file', data: typeof t === 'string' ? enc.encode(t) : t });
  }
}

export class Directory {
  uri: string;
  constructor(p: unknown, name?: string) {
    this.uri = uriOf(p, name);
  }
  get name() {
    return nameOf(this.uri);
  }
  get exists() {
    return store.get(this.uri)?.kind === 'dir';
  }
  create() {
    store.set(this.uri, { kind: 'dir' });
  }
  delete() {
    for (const k of [...store.keys()]) if (k === this.uri || k.startsWith(this.uri + '/')) store.delete(k);
  }
  list() {
    const out: (File | Directory)[] = [];
    for (const [k, n] of store) {
      if (k.startsWith(this.uri + '/') && !k.slice(this.uri.length + 1).includes('/')) out.push(n.kind === 'dir' ? new Directory(k) : new File(k));
    }
    return out;
  }
  createDirectory(name: string) {
    const d = new Directory(this, name);
    d.create();
    return d;
  }
  createFile(name: string) {
    const f = new File(this, name);
    f.create();
    return f;
  }
}

store.set('file:///doc', { kind: 'dir' });
store.set('file:///cache', { kind: 'dir' });
export const Paths = { document: new Directory('file:///doc'), cache: new Directory('file:///cache') };
