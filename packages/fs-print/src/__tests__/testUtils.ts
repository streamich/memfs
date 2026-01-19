import type { FsSynchronousApi } from '@jsonjoy.com/fs-node-utils';
import type { DirectoryJSON } from '@jsonjoy.com/fs-core';

class MockFile {
  isDir = false;
  target?: string;
  constructor(public content: string) {}
}

class MockDir {
  isDir = true;
  entries = new Map<string, MockFile | MockDir>();
}

export function createTestFs(json: DirectoryJSON = {}): FsSynchronousApi {
  const root = new MockDir();

  // Populate from JSON
  for (const [path, content] of Object.entries(json)) {
    const parts = path.split('/').filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current.entries.has(part)) {
        current.entries.set(part, new MockDir());
      }
      current = current.entries.get(part) as MockDir;
    }
    const fileName = parts[parts.length - 1];
    current.entries.set(fileName, new MockFile(content as string));
  }

  function getNode(p: string): MockFile | MockDir | null {
    const parts = p.split('/').filter(Boolean);
    let current: any = root;
    for (const part of parts) {
      if (current.isDir && current.entries.has(part)) {
        current = current.entries.get(part);
      } else {
        return null;
      }
    }
    return current;
  }

  const fs = {
    readdirSync(p: string, opts?: { withFileTypes?: boolean }): any[] {
      const node = getNode(p);
      if (!node || !node.isDir) throw new Error(`ENOENT: ${p}`);
      const entries = Array.from((node as MockDir).entries.entries());
      if (opts?.withFileTypes) {
        return entries.map(([name, item]) => ({
          name,
          isDirectory: () => item.isDir,
          isFile: () => !item.isDir && !(item as MockFile).target,
          isSymbolicLink: () => !!(item as MockFile).target,
        }));
      }
      return entries.map(([name]) => name);
    },
    readlinkSync(p: string): string {
      const node = getNode(p);
      if (!node || node.isDir) throw new Error(`ENOENT: ${p}`);
      if (!(node as MockFile).target) throw new Error(`EINVAL: ${p}`);
      return (node as MockFile).target!;
    },
    symlinkSync(target: string, path: string): void {
      const parts = path.split('/').filter(Boolean);
      let current = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current.entries.has(part)) {
          current.entries.set(part, new MockDir());
        }
        current = current.entries.get(part) as MockDir;
      }
      const link = new MockFile('');
      link.target = target;
      current.entries.set(parts[parts.length - 1], link);
    },
  } as FsSynchronousApi;

  return fs;
}
