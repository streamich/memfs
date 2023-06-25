import { SnapshotNodeType } from './constants';
import type { AsyncSnapshotOptions, SnapshotNode } from './types';

export const toSnapshot = async ({ fs, path = '/', separator = '/' }: AsyncSnapshotOptions): Promise<SnapshotNode> => {
  const stats = await fs.lstat(path);
  if (stats.isDirectory()) {
    const list = await fs.readdir(path);
    const entries: { [child: string]: SnapshotNode } = {};
    const dir = path.endsWith(separator) ? path : path + separator;
    for (const child of list) {
      const childSnapshot = await toSnapshot({ fs, path: `${dir}${child}`, separator });
      if (childSnapshot) entries['' + child] = childSnapshot;
    }
    return [SnapshotNodeType.Folder, {}, entries];
  } else if (stats.isFile()) {
    const buf = (await fs.readFile(path)) as Buffer;
    const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    return [SnapshotNodeType.File, {}, uint8];
  } else if (stats.isSymbolicLink()) {
    return [
      SnapshotNodeType.Symlink,
      {
        target: (await fs.readlink(path, { encoding: 'utf8' })) as string,
      },
    ];
  }
  return null;
};

export const fromSnapshot = async (
  snapshot: SnapshotNode,
  { fs, path = '/', separator = '/' }: AsyncSnapshotOptions,
): Promise<void> => {
  if (!snapshot) return;
  switch (snapshot[0]) {
    case SnapshotNodeType.Folder: {
      if (!path.endsWith(separator)) path = path + separator;
      const [, , entries] = snapshot;
      await fs.mkdir(path, { recursive: true });
      for (const [name, child] of Object.entries(entries))
        await fromSnapshot(child, { fs, path: `${path}${name}`, separator });
      break;
    }
    case SnapshotNodeType.File: {
      const [, , data] = snapshot;
      await fs.writeFile(path, data);
      break;
    }
    case SnapshotNodeType.Symlink: {
      const [, { target }] = snapshot;
      await fs.symlink(target, path);
      break;
    }
  }
};
