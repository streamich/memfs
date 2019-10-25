import {
  Volume,
  TFilePath,
  TData,
  TMode,
  TFlags,
  TFlagsCopy,
  TSymlinkType,
  TTime,
  IOptions,
  IAppendFileOptions,
  IMkdirOptions,
  IReaddirOptions,
  IReadFileOptions,
  IRealpathOptions,
  IWriteFileOptions,
  IStatOptions,
} from './volume';
import { Buffer } from './internal/buffer';
import Stats from './Stats';
import Dirent from './Dirent';
import { TDataOut } from './encoding';

function promisify(
  vol: Volume,
  fn: string,
  getResult: (result: any) => any = input => input,
): (...args) => Promise<any> {
  return (...args) =>
    new Promise((resolve, reject) => {
      vol[fn].bind(vol)(...args, (error, result) => {
        if (error) return reject(error);
        return resolve(getResult(result));
      });
    });
}

export interface TFileHandleReadResult {
  bytesRead: number;
  buffer: Buffer | Uint8Array;
}

export interface TFileHandleWriteResult {
  bytesWritten: number;
  buffer: Buffer | Uint8Array;
}

export interface IFileHandle {
  fd: number;
  appendFile(data: TData, options?: IAppendFileOptions | string): Promise<void>;
  chmod(mode: TMode): Promise<void>;
  chown(uid: number, gid: number): Promise<void>;
  close(): Promise<void>;
  datasync(): Promise<void>;
  read(buffer: Buffer | Uint8Array, offset: number, length: number, position: number): Promise<TFileHandleReadResult>;
  readFile(options?: IReadFileOptions | string): Promise<TDataOut>;
  stat(options?: IStatOptions): Promise<Stats>;
  truncate(len?: number): Promise<void>;
  utimes(atime: TTime, mtime: TTime): Promise<void>;
  write(
    buffer: Buffer | Uint8Array,
    offset?: number,
    length?: number,
    position?: number,
  ): Promise<TFileHandleWriteResult>;
  writeFile(data: TData, options?: IWriteFileOptions): Promise<void>;
}

export type TFileHandle = TFilePath | IFileHandle;

export interface IPromisesAPI {
  FileHandle;
  access(path: TFilePath, mode?: number): Promise<void>;
  appendFile(path: TFileHandle, data: TData, options?: IAppendFileOptions | string): Promise<void>;
  chmod(path: TFilePath, mode: TMode): Promise<void>;
  chown(path: TFilePath, uid: number, gid: number): Promise<void>;
  copyFile(src: TFilePath, dest: TFilePath, flags?: TFlagsCopy): Promise<void>;
  lchmod(path: TFilePath, mode: TMode): Promise<void>;
  lchown(path: TFilePath, uid: number, gid: number): Promise<void>;
  link(existingPath: TFilePath, newPath: TFilePath): Promise<void>;
  lstat(path: TFilePath, options?: IStatOptions): Promise<Stats>;
  mkdir(path: TFilePath, options?: TMode | IMkdirOptions): Promise<void>;
  mkdtemp(prefix: string, options?: IOptions): Promise<TDataOut>;
  open(path: TFilePath, flags: TFlags, mode?: TMode): Promise<FileHandle>;
  readdir(path: TFilePath, options?: IReaddirOptions | string): Promise<TDataOut[] | Dirent[]>;
  readFile(id: TFileHandle, options?: IReadFileOptions | string): Promise<TDataOut>;
  readlink(path: TFilePath, options?: IOptions): Promise<TDataOut>;
  realpath(path: TFilePath, options?: IRealpathOptions | string): Promise<TDataOut>;
  rename(oldPath: TFilePath, newPath: TFilePath): Promise<void>;
  rmdir(path: TFilePath): Promise<void>;
  stat(path: TFilePath, options?: IStatOptions): Promise<Stats>;
  symlink(target: TFilePath, path: TFilePath, type?: TSymlinkType): Promise<void>;
  truncate(path: TFilePath, len?: number): Promise<void>;
  unlink(path: TFilePath): Promise<void>;
  utimes(path: TFilePath, atime: TTime, mtime: TTime): Promise<void>;
  writeFile(id: TFileHandle, data: TData, options?: IWriteFileOptions): Promise<void>;
}

export class FileHandle implements IFileHandle {
  private vol: Volume;

  fd: number;

  constructor(vol: Volume, fd: number) {
    this.vol = vol;
    this.fd = fd;
  }

  appendFile(data: TData, options?: IAppendFileOptions | string): Promise<void> {
    return promisify(this.vol, 'appendFile')(this.fd, data, options);
  }

  chmod(mode: TMode): Promise<void> {
    return promisify(this.vol, 'fchmod')(this.fd, mode);
  }

  chown(uid: number, gid: number): Promise<void> {
    return promisify(this.vol, 'fchown')(this.fd, uid, gid);
  }

  close(): Promise<void> {
    return promisify(this.vol, 'close')(this.fd);
  }

  datasync(): Promise<void> {
    return promisify(this.vol, 'fdatasync')(this.fd);
  }

  read(buffer: Buffer | Uint8Array, offset: number, length: number, position: number): Promise<TFileHandleReadResult> {
    return promisify(this.vol, 'read', bytesRead => ({ bytesRead, buffer }))(this.fd, buffer, offset, length, position);
  }

  readFile(options?: IReadFileOptions | string): Promise<TDataOut> {
    return promisify(this.vol, 'readFile')(this.fd, options);
  }

  stat(options?: IStatOptions): Promise<Stats> {
    return promisify(this.vol, 'fstat')(this.fd, options);
  }

  sync(): Promise<void> {
    return promisify(this.vol, 'fsync')(this.fd);
  }

  truncate(len?: number): Promise<void> {
    return promisify(this.vol, 'ftruncate')(this.fd, len);
  }

  utimes(atime: TTime, mtime: TTime): Promise<void> {
    return promisify(this.vol, 'futimes')(this.fd, atime, mtime);
  }

  write(
    buffer: Buffer | Uint8Array,
    offset?: number,
    length?: number,
    position?: number,
  ): Promise<TFileHandleWriteResult> {
    return promisify(this.vol, 'write', bytesWritten => ({ bytesWritten, buffer }))(
      this.fd,
      buffer,
      offset,
      length,
      position,
    );
  }

  writeFile(data: TData, options?: IWriteFileOptions): Promise<void> {
    return promisify(this.vol, 'writeFile')(this.fd, data, options);
  }
}

export default function createPromisesApi(vol: Volume): null | IPromisesAPI {
  if (typeof Promise === 'undefined') return null;
  return {
    FileHandle,

    access(path: TFilePath, mode?: number): Promise<void> {
      return promisify(vol, 'access')(path, mode);
    },

    appendFile(path: TFileHandle, data: TData, options?: IAppendFileOptions | string): Promise<void> {
      return promisify(vol, 'appendFile')(path instanceof FileHandle ? path.fd : (path as TFilePath), data, options);
    },

    chmod(path: TFilePath, mode: TMode): Promise<void> {
      return promisify(vol, 'chmod')(path, mode);
    },

    chown(path: TFilePath, uid: number, gid: number): Promise<void> {
      return promisify(vol, 'chown')(path, uid, gid);
    },

    copyFile(src: TFilePath, dest: TFilePath, flags?: TFlagsCopy): Promise<void> {
      return promisify(vol, 'copyFile')(src, dest, flags);
    },

    lchmod(path: TFilePath, mode: TMode): Promise<void> {
      return promisify(vol, 'lchmod')(path, mode);
    },

    lchown(path: TFilePath, uid: number, gid: number): Promise<void> {
      return promisify(vol, 'lchown')(path, uid, gid);
    },

    link(existingPath: TFilePath, newPath: TFilePath): Promise<void> {
      return promisify(vol, 'link')(existingPath, newPath);
    },

    lstat(path: TFilePath, options?: IStatOptions): Promise<Stats> {
      return promisify(vol, 'lstat')(path, options);
    },

    mkdir(path: TFilePath, options?: TMode | IMkdirOptions): Promise<void> {
      return promisify(vol, 'mkdir')(path, options);
    },

    mkdtemp(prefix: string, options?: IOptions): Promise<TDataOut> {
      return promisify(vol, 'mkdtemp')(prefix, options);
    },

    open(path: TFilePath, flags: TFlags, mode?: TMode): Promise<FileHandle> {
      return promisify(vol, 'open', fd => new FileHandle(vol, fd))(path, flags, mode);
    },

    readdir(path: TFilePath, options?: IReaddirOptions | string): Promise<TDataOut[] | Dirent[]> {
      return promisify(vol, 'readdir')(path, options);
    },

    readFile(id: TFileHandle, options?: IReadFileOptions | string): Promise<TDataOut> {
      return promisify(vol, 'readFile')(id instanceof FileHandle ? id.fd : (id as TFilePath), options);
    },

    readlink(path: TFilePath, options?: IOptions): Promise<TDataOut> {
      return promisify(vol, 'readlink')(path, options);
    },

    realpath(path: TFilePath, options?: IRealpathOptions | string): Promise<TDataOut> {
      return promisify(vol, 'realpath')(path, options);
    },

    rename(oldPath: TFilePath, newPath: TFilePath): Promise<void> {
      return promisify(vol, 'rename')(oldPath, newPath);
    },

    rmdir(path: TFilePath): Promise<void> {
      return promisify(vol, 'rmdir')(path);
    },

    stat(path: TFilePath, options?: IStatOptions): Promise<Stats> {
      return promisify(vol, 'stat')(path, options);
    },

    symlink(target: TFilePath, path: TFilePath, type?: TSymlinkType): Promise<void> {
      return promisify(vol, 'symlink')(target, path, type);
    },

    truncate(path: TFilePath, len?: number): Promise<void> {
      return promisify(vol, 'truncate')(path, len);
    },

    unlink(path: TFilePath): Promise<void> {
      return promisify(vol, 'unlink')(path);
    },

    utimes(path: TFilePath, atime: TTime, mtime: TTime): Promise<void> {
      return promisify(vol, 'utimes')(path, atime, mtime);
    },

    writeFile(id: TFileHandle, data: TData, options?: IWriteFileOptions): Promise<void> {
      return promisify(vol, 'writeFile')(id instanceof FileHandle ? id.fd : (id as TFilePath), data, options);
    },
  };
}
