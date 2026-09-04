import { SystemError } from './SystemError';
import type { StatError } from './types';

/** The own keys Node puts on every libuv error, in Node's key order. */
export interface ErrnoException extends Error {
  errno?: number;
  code: string;
  syscall: string;
  path?: string;
  dest?: string;
}

// Linux errno, negated as libuv does, uv_strerror text.
const UV: Record<string, [errno: number, message: string]> = {
  EPERM: [-1, 'operation not permitted'],
  ENOENT: [-2, 'no such file or directory'],
  EIO: [-5, 'i/o error'],
  EBADF: [-9, 'bad file descriptor'],
  EAGAIN: [-11, 'resource temporarily unavailable'],
  EACCES: [-13, 'permission denied'],
  EBUSY: [-16, 'resource busy or locked'],
  EEXIST: [-17, 'file already exists'],
  EXDEV: [-18, 'cross-device link not permitted'],
  ENOTDIR: [-20, 'not a directory'],
  EISDIR: [-21, 'illegal operation on a directory'],
  EINVAL: [-22, 'invalid argument'],
  ENFILE: [-23, 'file table overflow'],
  EMFILE: [-24, 'too many open files'],
  ETXTBSY: [-26, 'text file is busy'],
  EFBIG: [-27, 'file too large'],
  ENOSPC: [-28, 'no space left on device'],
  ESPIPE: [-29, 'invalid seek'],
  EROFS: [-30, 'read-only file system'],
  EMLINK: [-31, 'too many links'],
  ERANGE: [-34, 'result too large'],
  ENAMETOOLONG: [-36, 'name too long'],
  ENOSYS: [-38, 'function not implemented'],
  ENOTEMPTY: [-39, 'directory not empty'],
  ELOOP: [-40, 'too many symbolic links encountered'],
  EPROTO: [-71, 'protocol error'],
  EOVERFLOW: [-75, 'value too large for defined data type'],
  ENOTSUP: [-95, 'operation not supported on socket'],
};

const formatMessage = (code: string, uv: [number, string] | undefined, syscall: string, path: string, dest: string) => {
  let message = code + ': ' + (uv ? uv[1] : 'unknown error') + ', ' + syscall;
  if (path) message += " '" + path + "'";
  if (dest) message += " -> '" + dest + "'";
  return message;
};

export const createError = (
  code: string,
  syscall = '',
  path = '',
  dest = '',
  Constructor: ErrorConstructor = Error,
): ErrnoException => {
  const uv = UV[code];
  const error = new Constructor(formatMessage(code, uv, syscall, path, dest)) as ErrnoException;
  if (uv) error.errno = uv[0];
  error.code = code;
  error.syscall = syscall;
  if (path) error.path = path;
  if (dest) error.dest = dest;
  return error;
};

export const createStatError = (code: string, syscall = '', path = '', dest = ''): StatError => {
  const uv = UV[code];
  return {
    errno: uv ? uv[0] : undefined,
    code,
    syscall,
    path,
    dest,
    message: formatMessage(code, uv, syscall, path, dest),
    toError: () => createError(code, syscall, path, dest),
  };
};

export interface WatchErrnoException extends ErrnoException {
  filename: string;
}

export const createWatchError = (code: string, filename: string): WatchErrnoException => {
  const uv = UV[code];
  const error = new Error(formatMessage(code, uv, 'watch', filename, '')) as WatchErrnoException;
  if (uv) error.errno = uv[0];
  error.syscall = 'watch';
  error.code = code;
  error.path = filename;
  error.filename = filename;
  return error;
};

export const createEisdirError = (syscall: string, path: string): SystemError =>
  new SystemError('ERR_FS_EISDIR', 'Path is a directory', {
    code: 'EISDIR',
    message: 'is a directory',
    path,
    syscall,
    errno: -UV.EISDIR[0],
  });
