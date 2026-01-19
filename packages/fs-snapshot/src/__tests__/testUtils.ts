import type { FsPromisesApi, FsSynchronousApi } from '@jsonjoy.com/fs-node-utils';

export interface DirectoryJSON {
  [path: string]: string | DirectoryJSON | Uint8Array | null;
}

class MockFile {
  isDir = false;
  target?: string;
  content: Buffer;
  constructor(content: string | Uint8Array | Buffer) {
    if (content instanceof Buffer) {
      this.content = content;
    } else if (content instanceof Uint8Array) {
      this.content = Buffer.from(content);
    } else {
      this.content = Buffer.from(content);
    }
  }
}

class MockDir {
  isDir = true;
  entries = new Map<string, MockFile | MockDir>();
}

function populateFromJson(root: MockDir, json: DirectoryJSON, basePath: string = '/') {
  for (const [key, value] of Object.entries(json)) {
    const cleanKey = key.replace(/^\//, '');
    if (value === null) {
      root.entries.set(cleanKey, new MockDir());
    } else if (typeof value === 'object' && !(value instanceof Uint8Array)) {
      const subDir = new MockDir();
      root.entries.set(cleanKey, subDir);
      populateFromJson(subDir, value as DirectoryJSON, `${basePath}${cleanKey}/`);
    } else {
      root.entries.set(cleanKey, new MockFile(value as string | Uint8Array));
    }
  }
}

export function createMockFs(json: DirectoryJSON = {}): { fs: FsSynchronousApi & { promises: FsPromisesApi } } {
  const root = new MockDir();
  populateFromJson(root, json);

  function normalizePath(p: string): string {
    return p.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }

  function getNode(p: string): MockFile | MockDir | null {
    p = normalizePath(p);
    if (p === '/' || p === '') return root;
    const parts = p.split('/').filter(Boolean);
    let current: MockFile | MockDir = root;
    for (const part of parts) {
      if (current instanceof MockDir && current.entries.has(part)) {
        current = current.entries.get(part)!;
      } else {
        return null;
      }
    }
    return current;
  }

  function getParentAndName(p: string): { parent: MockDir; name: string } | null {
    p = normalizePath(p);
    const parts = p.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    const name = parts.pop()!;
    let current: MockFile | MockDir = root;
    for (const part of parts) {
      if (current instanceof MockDir && current.entries.has(part)) {
        current = current.entries.get(part)!;
      } else {
        return null;
      }
    }
    if (!(current instanceof MockDir)) return null;
    return { parent: current, name };
  }

  function mkdirSync(p: string, opts?: { recursive?: boolean }): void {
    p = normalizePath(p);
    const parts = p.split('/').filter(Boolean);
    let current = root;
    for (const part of parts) {
      if (!current.entries.has(part)) {
        if (opts?.recursive) {
          current.entries.set(part, new MockDir());
        } else {
          throw new Error(`ENOENT: no such file or directory, mkdir '${p}'`);
        }
      }
      const next = current.entries.get(part)!;
      if (!(next instanceof MockDir)) {
        throw new Error(`ENOTDIR: not a directory, mkdir '${p}'`);
      }
      current = next;
    }
  }

  function lstatSync(p: string): { isDirectory(): boolean; isFile(): boolean; isSymbolicLink(): boolean } {
    const node = getNode(p);
    if (!node) throw new Error(`ENOENT: no such file or directory, lstat '${p}'`);
    return {
      isDirectory: () => node instanceof MockDir,
      isFile: () => node instanceof MockFile && !node.target,
      isSymbolicLink: () => node instanceof MockFile && !!node.target,
    };
  }

  function readdirSync(p: string): string[] {
    const node = getNode(p);
    if (!node) throw new Error(`ENOENT: no such file or directory, readdir '${p}'`);
    if (!(node instanceof MockDir)) throw new Error(`ENOTDIR: not a directory, readdir '${p}'`);
    return Array.from(node.entries.keys()).sort();
  }

  function readFileSync(p: string): Buffer {
    const node = getNode(p);
    if (!node) throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    if (node instanceof MockDir) throw new Error(`EISDIR: illegal operation on a directory, read '${p}'`);
    return node.content;
  }

  function writeFileSync(p: string, data: string | Uint8Array | Buffer): void {
    const result = getParentAndName(p);
    if (!result) {
      const parts = normalizePath(p).split('/').filter(Boolean);
      if (parts.length === 1) {
        root.entries.set(parts[0], new MockFile(data));
        return;
      }
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }
    result.parent.entries.set(result.name, new MockFile(data));
  }

  function readlinkSync(p: string): string {
    const node = getNode(p);
    if (!node) throw new Error(`ENOENT: no such file or directory, readlink '${p}'`);
    if (node instanceof MockDir) throw new Error(`EINVAL: invalid argument, readlink '${p}'`);
    if (!node.target) throw new Error(`EINVAL: invalid argument, readlink '${p}'`);
    return node.target;
  }

  function symlinkSync(target: string, path: string): void {
    const result = getParentAndName(path);
    if (!result) throw new Error(`ENOENT: no such file or directory, symlink '${path}'`);
    const link = new MockFile('');
    link.target = target;
    result.parent.entries.set(result.name, link);
  }

  const fs = {
    mkdirSync,
    lstatSync,
    readdirSync,
    readFileSync,
    writeFileSync,
    readlinkSync,
    symlinkSync,
    promises: {
      mkdir: async (p: string, opts?: { recursive?: boolean }) => mkdirSync(p, opts),
      lstat: async (p: string) => lstatSync(p),
      readdir: async (p: string) => readdirSync(p),
      readFile: async (p: string) => readFileSync(p),
      writeFile: async (p: string, data: string | Uint8Array | Buffer) => writeFileSync(p, data),
      readlink: async (p: string, opts?: { encoding?: string }) => readlinkSync(p),
      symlink: async (target: string, path: string) => symlinkSync(target, path),
    } as FsPromisesApi,
  } as FsSynchronousApi & { promises: FsPromisesApi };

  return { fs };
}
