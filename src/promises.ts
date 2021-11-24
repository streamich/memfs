import {
  Volume,
  TData,
  TMode,
  TFlags,
  TFlagsCopy,
  TTime,
  IOptions,
  IAppendFileOptions,
  IMkdirOptions,
  IReaddirOptions,
  IReadFileOptions,
  IRealpathOptions,
  IWriteFileOptions,
  IStatOptions,
  IRmOptions,
  IFStatOptions,
} from './volume';
import Stats from './Stats';
import Dirent from './Dirent';
import { TDataOut } from './encoding';
import { PathLike, symlink } from 'fs';

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

export type TFileHandle = PathLike | IFileHandle;

export interface IPromisesAPI {
  FileHandle;
  access(path: PathLike, mode?: number): Promise<void>;
  appendFile(path: TFileHandle, data: TData, options?: IAppendFileOptions | string): Promise<void>;
  chmod(path: PathLike, mode: TMode): Promise<void>;
  chown(path: PathLike, uid: number, gid: number): Promise<void>;
  copyFile(src: PathLike, dest: PathLike, flags?: TFlagsCopy): Promise<void>;
  lchmod(path: PathLike, mode: TMode): Promise<void>;
  lchown(path: PathLike, uid: number, gid: number): Promise<void>;
  link(existingPath: PathLike, newPath: PathLike): Promise<void>;
  lstat(path: PathLike, options?: IStatOptions): Promise<Stats>;
  mkdir(path: PathLike, options?: TMode | IMkdirOptions): Promise<void>;
  mkdtemp(prefix: string, options?: IOptions): Promise<TDataOut>;
  open(path: PathLike, flags: TFlags, mode?: TMode): Promise<FileHandle>;
  readdir(path: PathLike, options?: IReaddirOptions | string): Promise<TDataOut[] | Dirent[]>;
  readFile(id: TFileHandle, options?: IReadFileOptions | string): Promise<TDataOut>;
  readlink(path: PathLike, options?: IOptions): Promise<TDataOut>;
  realpath(path: PathLike, options?: IRealpathOptions | string): Promise<TDataOut>;
  rename(oldPath: PathLike, newPath: PathLike): Promise<void>;
  rmdir(path: PathLike): Promise<void>;
  rm(path: PathLike, options?: IRmOptions): Promise<void>;
  stat(path: PathLike, options?: IStatOptions): Promise<Stats>;
  symlink(target: PathLike, path: PathLike, type?: symlink.Type): Promise<void>;
  truncate(path: PathLike, len?: number): Promise<void>;
  unlink(path: PathLike): Promise<void>;
  utimes(path: PathLike, atime: TTime, mtime: TTime): Promise<void>;
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

  stat(options?: IFStatOptions): Promise<Stats> {
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

    access(path: PathLike, mode?: number): Promise<void> {
      return promisify(vol, 'access')(path, mode);
    },

    appendFile(path: TFileHandle, data: TData, options?: IAppendFileOptions | string): Promise<void> {
      return promisify(vol, 'appendFile')(path instanceof FileHandle ? path.fd : (path as PathLike), data, options);
    },

    chmod(path: PathLike, mode: TMode): Promise<void> {
      return promisify(vol, 'chmod')(path, mode);
    },

    chown(path: PathLike, uid: number, gid: number): Promise<void> {
      return promisify(vol, 'chown')(path, uid, gid);
    },

    copyFile(src: PathLike, dest: PathLike, flags?: TFlagsCopy): Promise<void> {
      return promisify(vol, 'copyFile')(src, dest, flags);
    },

    lchmod(path: PathLike, mode: TMode): Promise<void> {
      return promisify(vol, 'lchmod')(path, mode);
    },

    lchown(path: PathLike, uid: number, gid: number): Promise<void> {
      return promisify(vol, 'lchown')(path, uid, gid);
    },

    link(existingPath: PathLike, newPath: PathLike): Promise<void> {
      return promisify(vol, 'link')(existingPath, newPath);
    },

    lstat(path: PathLike, options?: IStatOptions): Promise<Stats> {
      return promisify(vol, 'lstat')(path, options);
    },

    mkdir(path: PathLike, options?: TMode | IMkdirOptions): Promise<void> {
      return promisify(vol, 'mkdir')(path, options);
    },

    mkdtemp(prefix: string, options?: IOptions): Promise<TDataOut> {
      return promisify(vol, 'mkdtemp')(prefix, options);
    },

    open(path: PathLike, flags: TFlags, mode?: TMode): Promise<FileHandle> {
      return promisify(vol, 'open', fd => new FileHandle(vol, fd))(path, flags, mode);
    },

    readdir(path: PathLike, options?: IReaddirOptions | string): Promise<TDataOut[] | Dirent[]> {
      return promisify(vol, 'readdir')(path, options);
    },

    readFile(id: TFileHandle, options?: IReadFileOptions | string): Promise<TDataOut> {
      return promisify(vol, 'readFile')(id instanceof FileHandle ? id.fd : (id as PathLike), options);
    },

    readlink(path: PathLike, options?: IOptions): Promise<TDataOut> {
      return promisify(vol, 'readlink')(path, options);
    },

    realpath(path: PathLike, options?: IRealpathOptions | string): Promise<TDataOut> {
      return promisify(vol, 'realpath')(path, options);
    },

    rename(oldPath: PathLike, newPath: PathLike): Promise<void> {
      return promisify(vol, 'rename')(oldPath, newPath);
    },

    rmdir(path: PathLike): Promise<void> {
      return promisify(vol, 'rmdir')(path);
    },

    rm(path: PathLike, options?: IRmOptions): Promise<void> {
      return promisify(vol, 'rm')(path, options);
    },

    stat(path: PathLike, options?: IStatOptions): Promise<Stats> {
      return promisify(vol, 'stat')(path, options);
    },

    symlink(target: PathLike, path: PathLike, type?: symlink.Type): Promise<void> {
      return promisify(vol, 'symlink')(target, path, type);
    },

    truncate(path: PathLike, len?: number): Promise<void> {
      return promisify(vol, 'truncate')(path, len);
    },

    unlink(path: PathLike): Promise<void> {
      return promisify(vol, 'unlink')(path);
    },

    utimes(path: PathLike, atime: TTime, mtime: TTime): Promise<void> {
      return promisify(vol, 'utimes')(path, atime, mtime);
    },

    writeFile(id: TFileHandle, data: TData, options?: IWriteFileOptions): Promise<void> {
      return promisify(vol, 'writeFile')(id instanceof FileHandle ? id.fd : (id as PathLike), data, options);
    },
  };
}
