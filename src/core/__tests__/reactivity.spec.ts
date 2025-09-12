import {FLAG} from '../../consts/FLAG';
import {MODE} from '../../node/constants';
import {Superblock} from '../Superblock';

describe('"modify" event', () => {
  test('emits on file re-write', async () => {
    const superblock = new Superblock();
    superblock.mkdir('/test', MODE.DIR);
    superblock.writeFile('/test/file.txt', Buffer.from('Hello, World'), FLAG.O_CREAT, MODE.FILE);
    const link = superblock.getLink(['test', 'file.txt'])!;
    const node = link.getNode();
    const events: string[] = [];
    node.changes.listen(([type]) => {
      events.push(type);
    });
    superblock.writeFile('/test/file.txt', Buffer.from('Hello, World!'), FLAG.O_CREAT, MODE.FILE);
    expect(events).toEqual(['modify']);
  });
});

describe('"delete" event', () => {
  test('emits on file delete', async () => {
    const superblock = new Superblock();
    superblock.mkdir('/test', MODE.DIR);
    superblock.writeFile('/test/file.txt', Buffer.from('Hello, World'), FLAG.O_CREAT, MODE.FILE);
    const link = superblock.getLink(['test', 'file.txt'])!;
    const node = link.getNode();
    const events: string[] = [];
    node.changes.listen(([type]) => {
      events.push(type);
    });
    superblock.unlink('/test/file.txt');
    expect(events).toEqual(['delete']);
  });
});
