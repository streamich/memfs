import { promisify } from './util';
import { constants } from '../constants';
import type * as opts from './types/options';
import type * as misc from './types/misc';
import type { FsCallbackApi, FsPromisesApi } from './types';

export class FsPromises implements FsPromisesApi {
  public readonly constants = constants;

  public constructor(
    protected readonly fs: FsCallbackApi,
    public readonly FileHandle: new (...args: unknown[]) => misc.IFileHandle,
  ) {}

  public readonly cp = promisify(this.fs, 'cp');
  public readonly opendir = promisify(this.fs, 'opendir');
  public readonly statfs = promisify(this.fs, 'statfs');
  public readonly lutimes = promisify(this.fs, 'lutimes');
  public readonly access = promisify(this.fs, 'access');
  public readonly chmod = promisify(this.fs, 'chmod');
  public readonly chown = promisify(this.fs, 'chown');
  public readonly copyFile = promisify(this.fs, 'copyFile');
  public readonly lchmod = promisify(this.fs, 'lchmod');
  public readonly lchown = promisify(this.fs, 'lchown');
  public readonly link = promisify(this.fs, 'link');
  public readonly lstat = promisify(this.fs, 'lstat');
  public readonly mkdir = promisify(this.fs, 'mkdir');
  public readonly mkdtemp = promisify(this.fs, 'mkdtemp');
  public readonly readdir = promisify(this.fs, 'readdir');
  public readonly readlink = promisify(this.fs, 'readlink');
  public readonly realpath = promisify(this.fs, 'realpath');
  public readonly rename = promisify(this.fs, 'rename');
  public readonly rmdir = promisify(this.fs, 'rmdir');
  public readonly rm = promisify(this.fs, 'rm');
  public readonly stat = promisify(this.fs, 'stat');
  public readonly symlink = promisify(this.fs, 'symlink');
  public readonly truncate = promisify(this.fs, 'truncate');
  public readonly unlink = promisify(this.fs, 'unlink');
  public readonly utimes = promisify(this.fs, 'utimes');

  public readonly readFile = (
    id: misc.TFileHandle,
    options?: opts.IReadFileOptions | string,
  ): Promise<misc.TDataOut> => {
    return promisify(this.fs, 'readFile')(id instanceof this.FileHandle ? id.fd : (id as misc.PathLike), options);
  };

  public readonly appendFile = (
    path: misc.TFileHandle,
    data: misc.TData,
    options?: opts.IAppendFileOptions | string,
  ): Promise<void> => {
    return promisify(this.fs, 'appendFile')(
      path instanceof this.FileHandle ? path.fd : (path as misc.PathLike),
      data,
      options,
    );
  };

  public readonly open = (path: misc.PathLike, flags: misc.TFlags = 'r', mode?: misc.TMode) => {
    return promisify(this.fs, 'open', fd => new this.FileHandle(this.fs, fd))(path, flags, mode);
  };

  public readonly writeFile = (
    id: misc.TFileHandle,
    data: misc.TData,
    options?: opts.IWriteFileOptions,
  ): Promise<void> => {
    return promisify(this.fs, 'writeFile')(
      id instanceof this.FileHandle ? id.fd : (id as misc.PathLike),
      data,
      options,
    );
  };

  public readonly watch = () => {
    throw new Error('Not implemented');
  };
}
