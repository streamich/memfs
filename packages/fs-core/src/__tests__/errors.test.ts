import { createError, createStatError, createEisdirError, createWatchError } from '../errors';
import { SystemError } from '../SystemError';

describe('createError', () => {
  test('sets Node own keys in Node key order', () => {
    const err = createError('ENOENT', 'open', '/a');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("ENOENT: no such file or directory, open '/a'");
    expect(Object.keys(err)).toEqual(['errno', 'code', 'syscall', 'path']);
    expect(err).toMatchObject({ errno: -2, code: 'ENOENT', syscall: 'open', path: '/a' });
  });

  test('adds dest for two-path syscalls', () => {
    const err = createError('EEXIST', 'rename', '/a', '/b');
    expect(err.message).toBe("EEXIST: file already exists, rename '/a' -> '/b'");
    expect(Object.keys(err)).toEqual(['errno', 'code', 'syscall', 'path', 'dest']);
    expect(err).toMatchObject({ errno: -17, code: 'EEXIST', syscall: 'rename', path: '/a', dest: '/b' });
  });

  test('omits path when the syscall has none', () => {
    const err = createError('EBADF', 'fstat');
    expect(err.message).toBe('EBADF: bad file descriptor, fstat');
    expect(Object.keys(err)).toEqual(['errno', 'code', 'syscall']);
    expect(err).toMatchObject({ errno: -9, code: 'EBADF', syscall: 'fstat' });
  });

  test.each([
    ['EPERM', -1, 'operation not permitted'],
    ['ENOENT', -2, 'no such file or directory'],
    ['EIO', -5, 'i/o error'],
    ['EBADF', -9, 'bad file descriptor'],
    ['EAGAIN', -11, 'resource temporarily unavailable'],
    ['EACCES', -13, 'permission denied'],
    ['EBUSY', -16, 'resource busy or locked'],
    ['EEXIST', -17, 'file already exists'],
    ['EXDEV', -18, 'cross-device link not permitted'],
    ['ENOTDIR', -20, 'not a directory'],
    ['EISDIR', -21, 'illegal operation on a directory'],
    ['EINVAL', -22, 'invalid argument'],
    ['ENFILE', -23, 'file table overflow'],
    ['EMFILE', -24, 'too many open files'],
    ['ETXTBSY', -26, 'text file is busy'],
    ['EFBIG', -27, 'file too large'],
    ['ENOSPC', -28, 'no space left on device'],
    ['ESPIPE', -29, 'invalid seek'],
    ['EROFS', -30, 'read-only file system'],
    ['EMLINK', -31, 'too many links'],
    ['ERANGE', -34, 'result too large'],
    ['ENAMETOOLONG', -36, 'name too long'],
    ['ENOSYS', -38, 'function not implemented'],
    ['ENOTEMPTY', -39, 'directory not empty'],
    ['ELOOP', -40, 'too many symbolic links encountered'],
    ['EPROTO', -71, 'protocol error'],
    ['EOVERFLOW', -75, 'value too large for defined data type'],
    ['ENOTSUP', -95, 'operation not supported on socket'],
  ])('%s has the Linux errno and libuv text', (code, errno, text) => {
    const err = createError(code, 'open', '/a');
    expect(err.errno).toBe(errno);
    expect(err.message).toBe(code + ': ' + text + ", open '/a'");
  });

  test('unknown code carries no errno', () => {
    const err = createError('EWHAT', 'open');
    expect(err.message).toBe('EWHAT: unknown error, open');
    expect(Object.keys(err)).toEqual(['code', 'syscall']);
  });

  test('uses the given constructor', () => {
    const err = createError('EINVAL', 'read', '', '', RangeError);
    expect(err).toBeInstanceOf(RangeError);
    expect(err.code).toBe('EINVAL');
  });
});

describe('createStatError', () => {
  test('carries the same fields and converts to the same error', () => {
    const stat = createStatError('ENOTDIR', 'scandir', '/a');
    expect(stat).toMatchObject({ errno: -20, code: 'ENOTDIR', syscall: 'scandir', path: '/a', dest: '' });
    expect(stat.message).toBe("ENOTDIR: not a directory, scandir '/a'");
    const err = stat.toError();
    expect(err.message).toBe(stat.message);
    expect(Object.keys(err)).toEqual(['errno', 'code', 'syscall', 'path']);
    expect(err).toMatchObject({ errno: -20, code: 'ENOTDIR', syscall: 'scandir', path: '/a' });
  });
});

describe('createEisdirError', () => {
  test('is a SystemError shaped like Node', () => {
    const err = createEisdirError('rm', '/d');
    expect(err).toBeInstanceOf(SystemError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('SystemError');
    expect(err.message).toBe('Path is a directory: rm returned EISDIR (is a directory) /d');
    expect(String(err)).toBe(
      'SystemError [ERR_FS_EISDIR]: Path is a directory: rm returned EISDIR (is a directory) /d',
    );
    expect(Object.keys(err)).toEqual(['code', 'info', 'errno', 'syscall', 'path']);
    expect(err).toMatchObject({
      code: 'ERR_FS_EISDIR',
      info: { code: 'EISDIR', message: 'is a directory', path: '/d', syscall: 'rm', errno: 21 },
      errno: 21,
      syscall: 'rm',
      path: '/d',
    });
  });
});

describe('createWatchError', () => {
  test('uses the key order of Node watch errors', () => {
    const err = createWatchError('ENOENT', '/w');
    expect(err.message).toBe("ENOENT: no such file or directory, watch '/w'");
    expect(Object.keys(err)).toEqual(['errno', 'syscall', 'code', 'path', 'filename']);
    expect(err).toMatchObject({ errno: -2, syscall: 'watch', code: 'ENOENT', path: '/w', filename: '/w' });
  });
});

(process.platform === 'linux' ? describe : describe.skip)('on Linux', () => {
  test('errno matches the host table', () => {
    const errno = require('os').constants.errno;
    for (const code of Object.keys(errno)) {
      const err = createError(code, 'open');
      if (err.errno !== undefined) expect(err.errno).toBe(-errno[code]);
    }
  });
});
