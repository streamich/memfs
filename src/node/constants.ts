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
