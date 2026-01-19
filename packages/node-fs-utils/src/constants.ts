export const SEP = '/';

export const enum PATH {
  SEP = '/',
}

export const constants = {
  O_RDONLY: 0,
  O_WRONLY: 1,
  O_RDWR: 2,
  S_IFMT: 61440,
  S_IFREG: 32768,
  S_IFDIR: 16384,
  S_IFCHR: 8192,
  S_IFBLK: 24576,
  S_IFIFO: 4096,
  S_IFLNK: 40960,
  S_IFSOCK: 49152,
  O_CREAT: 64,
  O_EXCL: 128,
  O_NOCTTY: 256,
  O_TRUNC: 512,
  O_APPEND: 1024,
  O_DIRECTORY: 65536,
  O_NOATIME: 262144,
  O_NOFOLLOW: 131072,
  O_SYNC: 1052672,
  O_SYMLINK: 2097152,
  O_DIRECT: 16384,
  O_NONBLOCK: 2048,
  S_IRWXU: 448,
  S_IRUSR: 256,
  S_IWUSR: 128,
  S_IXUSR: 64,
  S_IRWXG: 56,
  S_IRGRP: 32,
  S_IWGRP: 16,
  S_IXGRP: 8,
  S_IRWXO: 7,
  S_IROTH: 4,
  S_IWOTH: 2,
  S_IXOTH: 1,

  F_OK: 0,
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,

  UV_FS_SYMLINK_DIR: 1,
  UV_FS_SYMLINK_JUNCTION: 2,

  UV_FS_COPYFILE_EXCL: 1,
  UV_FS_COPYFILE_FICLONE: 2,
  UV_FS_COPYFILE_FICLONE_FORCE: 4,
  COPYFILE_EXCL: 1,
  COPYFILE_FICLONE: 2,
  COPYFILE_FICLONE_FORCE: 4,
};

export const enum S {
  ISUID = 0b100000000000, //  (04000)  set-user-ID (set process effective user ID on execve(2))
  ISGID = 0b10000000000, // (02000)  set-group-ID (set process effective group ID on execve(2); mandatory locking, as described in fcntl(2); take a new file's group from parent directory, as described in chown(2) and mkdir(2))
  ISVTX = 0b1000000000, // (01000)  sticky bit (restricted deletion flag, as described in unlink(2))
  IRUSR = 0b100000000, //  (00400)  read by owner
  IWUSR = 0b10000000, // (00200)  write by owner
  IXUSR = 0b1000000, // (00100)  execute/search by owner
  IRGRP = 0b100000, // (00040)  read by group
  IWGRP = 0b10000, // (00020)  write by group
  IXGRP = 0b1000, // (00010)  execute/search by group
  IROTH = 0b100, // (00004)  read by others
  IWOTH = 0b10, //  (00002)  write by others
  IXOTH = 0b1, //  (00001)  execute/search by others
}

// Default modes for opening files.
export const enum MODE {
  FILE = 0o666,
  DIR = 0o777,
  DEFAULT = MODE.FILE,
}

export const ERRSTR = {
  PATH_STR: 'path must be a string, Buffer, or Uint8Array',
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
