import { fsa, IFileSystemChangeRecord } from '..';
import { onlyOnNode20 } from './util';

onlyOnNode20('CoreFileSystemObserver', () => {
  test.skip('can listen to file writes', async () => {
    const { dir, FileSystemObserver } = fsa({ mode: 'readwrite' });
    const changes: IFileSystemChangeRecord[] = [];
    const observer = new FileSystemObserver(records => {
      changes.push(...records);
    });
    const file = await dir.getFileHandle('file.txt', { create: true });
    await observer.observe(file);
    expect(changes).toEqual([]);
    const writable = await file.createWritable();
    await writable.write('Hello, world!');
    await writable.close();
    expect(changes.length).toBe(1);
    expect(changes).toMatchObject([
      {
        type: 'modified',
      },
    ]);
    observer.disconnect();
  });
});
