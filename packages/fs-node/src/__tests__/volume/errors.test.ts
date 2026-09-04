import { constants } from '@jsonjoy.com/fs-node-utils';
import { Volume } from '../..';
import { create } from '../util';

const setup = () => {
  const vol = create({ '/dir/file': 'x', '/dir/sub/inner': 'y' });
  vol.symlinkSync('/dir/file', '/link');
  return vol;
};

const cases: [name: string, run: (vol: Volume) => unknown, expected: Record<string, unknown>][] = [
  ['openSync ENOENT', vol => vol.openSync('/nope', 'r'), { errno: -2, code: 'ENOENT', syscall: 'open', path: '/nope' }],
  [
    'openSync ELOOP with O_NOFOLLOW',
    vol => vol.openSync('/link', constants.O_RDONLY | constants.O_NOFOLLOW),
    { errno: -40, code: 'ELOOP', syscall: 'open', path: '/link' },
  ],
  [
    'readdirSync ENOTDIR',
    vol => vol.readdirSync('/dir/file'),
    { errno: -20, code: 'ENOTDIR', syscall: 'scandir', path: '/dir/file' },
  ],
  ['mkdirSync EEXIST', vol => vol.mkdirSync('/dir'), { errno: -17, code: 'EEXIST', syscall: 'mkdir', path: '/dir' }],
  [
    'rmdirSync ENOTEMPTY',
    vol => vol.rmdirSync('/dir'),
    { errno: -39, code: 'ENOTEMPTY', syscall: 'rmdir', path: '/dir' },
  ],
  [
    'renameSync ENOENT',
    vol => vol.renameSync('/nope', '/nope2'),
    { errno: -2, code: 'ENOENT', syscall: 'rename', path: '/nope', dest: '/nope2' },
  ],
  [
    'linkSync EEXIST',
    vol => vol.linkSync('/dir/file', '/dir/sub/inner'),
    { errno: -17, code: 'EEXIST', syscall: 'link', path: '/dir/file', dest: '/dir/sub/inner' },
  ],
  [
    'symlinkSync EEXIST',
    vol => vol.symlinkSync('/dir/file', '/dir/sub/inner'),
    { errno: -17, code: 'EEXIST', syscall: 'symlink', path: '/dir/file', dest: '/dir/sub/inner' },
  ],
  [
    'copyFileSync EEXIST',
    vol => vol.copyFileSync('/dir/file', '/dir/sub/inner', constants.COPYFILE_EXCL),
    { errno: -17, code: 'EEXIST', syscall: 'copyfile', path: '/dir/file', dest: '/dir/sub/inner' },
  ],
  ['fstatSync EBADF', vol => vol.fstatSync(9999), { errno: -9, code: 'EBADF', syscall: 'fstat' }],
  [
    'readlinkSync EINVAL',
    vol => vol.readlinkSync('/dir/file'),
    { errno: -22, code: 'EINVAL', syscall: 'readlink', path: '/dir/file' },
  ],
  [
    'utimesSync ENOENT',
    vol => vol.utimesSync('/nope', 1, 1),
    { errno: -2, code: 'ENOENT', syscall: 'utime', path: '/nope' },
  ],
  [
    'readSync EBADF',
    vol => vol.readSync(9999, Buffer.alloc(1), 0, 1, 0),
    { errno: -9, code: 'EBADF', syscall: 'read' },
  ],
  ['readFileSync EBADF', vol => vol.readFileSync(9999), { errno: -9, code: 'EBADF', syscall: 'fstat' }],
  [
    'watch ENOENT',
    vol => vol.watch('/nope'),
    { errno: -2, syscall: 'watch', code: 'ENOENT', path: '/nope', filename: '/nope' },
  ],
];

describe('libuv-shaped errors', () => {
  test.each(cases)('%s', (name, run, expected) => {
    const vol = setup();
    let error: any;
    try {
      run(vol);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject(expected);
    expect(Object.keys(error)).toEqual(Object.keys(expected));
  });

  test('message follows Node format', () => {
    const vol = setup();
    expect(() => vol.renameSync('/nope', '/nope2')).toThrow(
      "ENOENT: no such file or directory, rename '/nope' -> '/nope2'",
    );
    expect(() => vol.fstatSync(9999)).toThrow('EBADF: bad file descriptor, fstat');
  });

  test('async and promise paths carry the same shape', async () => {
    const vol = setup();
    const expected = { errno: -2, code: 'ENOENT', syscall: 'open', path: '/nope' };
    await expect(vol.promises.open('/nope', 'r')).rejects.toMatchObject(expected);
    const error = await new Promise<any>(resolve => vol.open('/nope', 'r', err => resolve(err)));
    expect(error).toMatchObject(expected);
  });
});
