import { bufferFrom } from '@jsonjoy.com/fs-node-builtins/lib/internal/buffer';
import { isWin, nullCheck, pathToFilename } from '../util';
import { createError, createStatError } from '../errors';

describe('pathToFilename', () => {
  test('returns a string as is', () => {
    expect(pathToFilename('/a/b')).toBe('/a/b');
  });

  test('accepts Buffer and Uint8Array', () => {
    expect(pathToFilename(bufferFrom('/a'))).toBe('/a');
    expect(pathToFilename(new Uint8Array([47, 98]))).toBe('/b');
  });

  test('accepts a file: URL', () => {
    expect(pathToFilename(new URL('file:///text.txt'))).toBe('/text.txt');
    expect(pathToFilename(new URL('file:///a%20b'))).toBe('/a b');
  });

  test('drive-letter URL follows the platform', () => {
    expect(pathToFilename(new URL('file:///C:/src/file.txt'))).toBe(isWin ? 'C:/src/file.txt' : '/C:/src/file.txt');
  });

  test('rejects an encoded slash in a URL', () => {
    expect(() => pathToFilename(new URL('file:///a%2Fb'))).toThrow(/must not include encoded/);
    expect(() => pathToFilename(new URL('file:///a%2fb'))).toThrow(/must not include encoded/);
  });

  test('rejects a URL with a host', () => {
    expect(() => pathToFilename(new URL('file://host/a'))).toThrow(/File URL host/);
  });

  test('rejects a non-file URL by its scheme, not its host', () => {
    expect(() => pathToFilename(new URL('http://host/a'))).toThrow(/must be of scheme file/);
  });

  test('rejects other types with ERR_INVALID_ARG_TYPE', () => {
    let error: any;
    try {
      pathToFilename(123 as any);
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(TypeError);
    expect(error.code).toBe('ERR_INVALID_ARG_TYPE');
    expect(error.message).toMatch(/The "path" argument must be of type string/);
    expect(() => pathToFilename({} as any, 'newPath')).toThrow(/The "newPath" argument/);
  });

  // a constructor-less object has no `String()`; it used to throw a codeless `Cannot convert object`
  test('describes an object with a null prototype', () => {
    expect(() => pathToFilename(Object.create(null))).toThrow(/Received \[Object: null prototype] \{}$/);
    expect(() => pathToFilename(Object.assign(Object.create(null), { a: 1 }))).toThrow(
      /Received \[Object: null prototype]$/,
    );
  });

  test('rejects null bytes', () => {
    expect(() => pathToFilename('/a\u0000b')).toThrow(/null bytes/);
  });
});

describe('nullCheck', () => {
  test('returns true for a clean path', () => {
    expect(nullCheck('/a')).toBe(true);
  });

  test('throws ERR_INVALID_ARG_VALUE for a null byte', () => {
    let error: any;
    try {
      nullCheck('/a\u0000');
    } catch (err) {
      error = err;
    }
    expect(error).toBeInstanceOf(TypeError);
    expect(error.code).toBe('ERR_INVALID_ARG_VALUE');
    expect(error.message).toMatch(/null bytes/);
  });

  test('names the argument it was given', () => {
    expect(() => nullCheck(String.fromCharCode(47, 97, 0), 'existingPath')).toThrow(/The argument 'existingPath'/);
  });

  // the TCK never reads a message, so the `util.inspect` shapes are only covered here
  test('inspects the value Node inspects', () => {
    const nul = String.fromCharCode(0);
    expect(() => nullCheck('a\\b' + nul)).toThrow(/Received 'a\\\\b\\x00'$/);
    expect(() => nullCheck('a\nb' + nul)).toThrow(/Received 'a\\nb\\x00'$/);
    expect(() => nullCheck("a'b" + nul)).toThrow(/Received "a'b\\x00"$/);
    expect(() => nullCheck(bufferFrom([97, 0, 98]))).toThrow(/Received <Buffer 61 00 62>$/);
    expect(() => nullCheck(new Uint8Array([97, 0, 98]))).toThrow(/Received Uint8Array\(3\) \[ 97, 0, 98 ]$/);
    expect(() => nullCheck('/' + 'a'.repeat(200) + nul)).toThrow(/\.\.\.$/);
  });
});

describe('createError', () => {
  test('sets code, path and message', () => {
    const error = createError('ENOENT', 'open', '/a');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("ENOENT: no such file or directory, open '/a'");
    expect((error as any).code).toBe('ENOENT');
    expect((error as any).path).toBe('/a');
  });

  test('omits path when empty', () => {
    const error = createError('EBADF', 'close');
    expect(error.message).toBe('EBADF: bad file descriptor, close');
    expect('path' in error).toBe(false);
  });

  test('formats the second path', () => {
    const error = createError('EEXIST', 'rename', '/a', '/b');
    expect(error.message).toBe("EEXIST: file already exists, rename '/a' -> '/b'");
    expect((error as any).path).toBe('/a');
  });

  test('has a message for every known code', () => {
    const codes = [
      'EPERM',
      'ENOENT',
      'EBADF',
      'EINVAL',
      'EPROTO',
      'EEXIST',
      'ENOTDIR',
      'EMFILE',
      'ELOOP',
      'EACCES',
      'EISDIR',
      'ENOTEMPTY',
      'ENOSYS',
      'ERR_FS_EISDIR',
      'ERR_OUT_OF_RANGE',
    ];
    for (const code of codes) {
      const error = createError(code, 'op', '/a');
      expect(error.message).not.toMatch(/error occurred/);
      expect(error.message).toContain(code);
    }
  });

  test('falls back for an unknown code', () => {
    expect(createError('EFOO', 'op', '/a').message).toBe("EFOO: unknown error, op '/a'");
  });

  test('uses the given constructor', () => {
    expect(createError('EINVAL', 'op', '', '', TypeError)).toBeInstanceOf(TypeError);
  });
});

describe('createStatError', () => {
  test('carries code, path and message', () => {
    const stat = createStatError('ENOTDIR', 'scandir', '/a');
    expect(stat.code).toBe('ENOTDIR');
    expect(stat.path).toBe('/a');
    expect(stat.message).toBe("ENOTDIR: not a directory, scandir '/a'");
  });

  test('toError builds the same error as createError', () => {
    const stat = createStatError('ENOENT', 'stat', '/a');
    const error = stat.toError();
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(stat.message);
    expect((error as any).code).toBe('ENOENT');
    expect((error as any).path).toBe('/a');
  });

  test('toError omits an empty path', () => {
    const error = createStatError('EBADF', 'fstat').toError();
    expect('path' in error).toBe(false);
  });
});
