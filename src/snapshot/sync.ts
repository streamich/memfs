import { SnapshotNodeType } from './constants';
import type { SnapshotNode, SnapshotOptions } from './types';

export const toSnapshotSync = ({ fs, path = '/', separator = '/' }: SnapshotOptions): SnapshotNode => {
  const stats = fs.lstatSync(path);
  if (stats.isDirectory()) {
    const list = fs.readdirSync(path);
    const entries: { [child: string]: SnapshotNode } = {};
    const dir = path.endsWith(separator) ? path : path + separator;
    for (const child of list) {
      const childSnapshot = toSnapshotSync({ fs, path: `${dir}${child}`, separator });
      if (childSnapshot) entries['' + child] = childSnapshot;
    }
    return [SnapshotNodeType.Folder, {}, entries];
  } else if (stats.isFile()) {
    const buf = fs.readFileSync(path) as Buffer;
    const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    return [SnapshotNodeType.File, {}, uint8];
  } else if (stats.isSymbolicLink()) {
    return [
      SnapshotNodeType.Symlink,
      {
        target: fs.readlinkSync(path).toString(),
      },
    ];
  }
  return null;
};

export const fromSnapshotSync = (
  snapshot: SnapshotNode,
  { fs, path = '/', separator = '/' }: SnapshotOptions,
): void => {
  if (!snapshot) return;
  switch (snapshot[0]) {
    case SnapshotNodeType.Folder: {
      if (!path.endsWith(separator)) path = path + separator;
      const [, , entries] = snapshot;
      fs.mkdirSync(path, { recursive: true });
      for (const [name, child] of Object.entries(entries))
        fromSnapshotSync(child, { fs, path: `${path}${name}`, separator });
      break;
    }
    case SnapshotNodeType.File: {
      const [, , data] = snapshot;
      fs.writeFileSync(path, data);
      break;
    }
    case SnapshotNodeType.Symlink: {
      const [, { target }] = snapshot;
      fs.symlinkSync(target, path);
      break;
    }
  }
};
