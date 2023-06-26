import { constants } from '../constants';

// Default modes for opening files.
export const enum MODE {
  FILE = 0o666,
  DIR = 0o777,
  DEFAULT = MODE.FILE,
}

export const ERRSTR = {
  PATH_STR: 'path must be a string or Buffer',
  // FD:             'file descriptor must be a unsigned 32-bit integer',
  FD: 'fd must be a file descriptor',
  MODE_INT: 'mode must be an int',
  CB: 'callback must be a function',
  UID: 'uid must be an unsigned int',
  GID: 'gid must be an unsigned int',
  LEN: 'len must be an integer',
  ATIME: 'atime must be an integer',
  MTIME: 'mtime must be an integer',
  PREFIX: 'filename prefix is required',
  BUFFER: 'buffer must be an instance of Buffer or StaticBuffer',
  OFFSET: 'offset must be an integer',
  LENGTH: 'length must be an integer',
  POSITION: 'position must be an integer',
};

const { O_RDONLY, O_WRONLY, O_RDWR, O_CREAT, O_EXCL, O_TRUNC, O_APPEND, O_SYNC } = constants;

// List of file `flags` as defined by Node.
export enum FLAGS {
  // Open file for reading. An exception occurs if the file does not exist.
  r = O_RDONLY,
  // Open file for reading and writing. An exception occurs if the file does not exist.
  'r+' = O_RDWR,
  // Open file for reading in synchronous mode. Instructs the operating system to bypass the local file system cache.
  rs = O_RDONLY | O_SYNC,
  sr = FLAGS.rs,
  // Open file for reading and writing, telling the OS to open it synchronously. See notes for 'rs' about using this with caution.
  'rs+' = O_RDWR | O_SYNC,
  'sr+' = FLAGS['rs+'],
  // Open file for writing. The file is created (if it does not exist) or truncated (if it exists).
  w = O_WRONLY | O_CREAT | O_TRUNC,
  // Like 'w' but fails if path exists.
  wx = O_WRONLY | O_CREAT | O_TRUNC | O_EXCL,
  xw = FLAGS.wx,
  // Open file for reading and writing. The file is created (if it does not exist) or truncated (if it exists).
  'w+' = O_RDWR | O_CREAT | O_TRUNC,
  // Like 'w+' but fails if path exists.
  'wx+' = O_RDWR | O_CREAT | O_TRUNC | O_EXCL,
  'xw+' = FLAGS['wx+'],
  // Open file for appending. The file is created if it does not exist.
  a = O_WRONLY | O_APPEND | O_CREAT,
  // Like 'a' but fails if path exists.
  ax = O_WRONLY | O_APPEND | O_CREAT | O_EXCL,
  xa = FLAGS.ax,
  // Open file for reading and appending. The file is created if it does not exist.
  'a+' = O_RDWR | O_APPEND | O_CREAT,
  // Like 'a+' but fails if path exists.
  'ax+' = O_RDWR | O_APPEND | O_CREAT | O_EXCL,
  'xa+' = FLAGS['ax+'],
}
