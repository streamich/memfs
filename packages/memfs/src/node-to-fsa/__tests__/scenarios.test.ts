import { nodeToFsa } from '..';
import { memfs } from '../..';
import { onlyOnNode20 } from '../../__tests__/util';

onlyOnNode20('scenarios', () => {
  test('can init FSA from an arbitrary FS folder and execute operations', async () => {
    const { fs, vol } = memfs({
      '/tmp': null,
      '/etc': null,
      '/bin': null,
      '/Users/kasper/Documents/shopping-list.txt': 'Milk, Eggs, Bread',
    });
    const dir = nodeToFsa(fs, '/Users/kasper/Documents', { mode: 'readwrite' });
    const shoppingListFile = await dir.getFileHandle('shopping-list.txt');
    const shoppingList = await shoppingListFile.getFile();
    expect(await shoppingList.text()).toBe('Milk, Eggs, Bread');
    const backupsDir = await dir.getDirectoryHandle('backups', { create: true });
    const backupFile = await backupsDir.getFileHandle('shopping-list.txt', { create: true });
    const writable = await backupFile.createWritable();
    await writable.write(await shoppingList.arrayBuffer());
    await writable.close();
    const logsFileHandle = await dir.getFileHandle('logs.csv', { create: true });
    const logsWritable = await logsFileHandle.createWritable();
    await logsWritable.write('timestamp,level,message\n');
    await logsWritable.write({ type: 'write', data: '2021-01-01T00:00:00Z,INFO,Hello World\n' });
    await logsWritable.close();
    expect(vol.toJSON()).toStrictEqual({
      '/tmp': null,
      '/etc': null,
      '/bin': null,
      '/Users/kasper/Documents/shopping-list.txt': 'Milk, Eggs, Bread',
      '/Users/kasper/Documents/backups/shopping-list.txt': 'Milk, Eggs, Bread',
      '/Users/kasper/Documents/logs.csv': 'timestamp,level,message\n2021-01-01T00:00:00Z,INFO,Hello World\n',
    });
  });
});
