import { createError, isFd, pathToFilename } from '../node/util';
import { pathToLocation } from './util';
import { ERRSTR } from '../node/constants';
import { FsaToNodeConstants } from './constants';
import { FsaNodeFsOpenFile } from './FsaNodeFsOpenFile';
import { FLAG } from '../consts/FLAG';
import type * as fsa from '../fsa/types';
import type * as misc from '../node/types/misc';
import type { FsaNodeSyncAdapter } from './types';

export class FsaNodeCore {
  protected static fd: number = 0x7fffffff;
  protected readonly fds = new Map<number, FsaNodeFsOpenFile>();

  public constructor(
    protected readonly root: fsa.IFileSystemDirectoryHandle,
    protected syncAdapter?: FsaNodeSyncAdapter,
  ) {}

  /**
   * A list of reusable (opened and closed) file descriptors, that should be
   * used first before creating a new file descriptor.
   */
  releasedFds: number[] = [];

  protected newFdNumber(): number {
    const releasedFd = this.releasedFds.pop();
    return typeof releasedFd === 'number' ? releasedFd : FsaNodeCore.fd--;
  }

  /**
   * @param path Path from root to the new folder.
   * @param create Whether to create the folders if they don't exist.
   */
  protected async getDir(path: string[], create: boolean, funcName?: string): Promise<fsa.IFileSystemDirectoryHandle> {
    let curr: fsa.IFileSystemDirectoryHandle = this.root;

    const options: fsa.GetDirectoryHandleOptions = { create };

    try {
      for (const name of path) {
        curr = await curr.getDirectoryHandle(name, options);
      }
    } catch (error) {
      if (error && typeof error === 'object' && error.name === 'TypeMismatchError')
        throw createError('ENOTDIR', funcName, path.join(FsaToNodeConstants.Separator));
      throw error;
    }
    return curr;
  }

  protected async getFile(
    path: string[],
    name: string,
    funcName?: string,
    create?: boolean,
  ): Promise<fsa.IFileSystemFileHandle> {
    const dir = await this.getDir(path, false, funcName);
    const file = await dir.getFileHandle(name, { create });
    return file;
  }

  protected async getFileOrDir(
    path: string[],
    name: string,
    funcName?: string,
    create?: boolean,
  ): Promise<fsa.IFileSystemFileHandle | fsa.IFileSystemDirectoryHandle> {
    const dir = await this.getDir(path, false, funcName);
    try {
      const file = await dir.getFileHandle(name);
      return file;
    } catch (error) {
      if (error && typeof error === 'object') {
        switch (error.name) {
          case 'TypeMismatchError':
            return await dir.getDirectoryHandle(name);
          case 'NotFoundError':
            throw createError('ENOENT', funcName, path.join(FsaToNodeConstants.Separator));
        }
      }
      throw error;
    }
  }

  protected async getFileByFd(fd: number, funcName?: string): Promise<FsaNodeFsOpenFile> {
    if (!isFd(fd)) throw TypeError(ERRSTR.FD);
    const file = this.fds.get(fd);
    if (!file) throw createError('EBADF', funcName);
    return file;
  }

  protected async getFileById(
    id: misc.TFileId,
    funcName?: string,
    create?: boolean,
  ): Promise<fsa.IFileSystemFileHandle> {
    if (typeof id === 'number') return (await this.getFileByFd(id, funcName)).file;
    const filename = pathToFilename(id);
    const [folder, name] = pathToLocation(filename);
    return await this.getFile(folder, name, funcName, create);
  }

  protected async getFileByIdOrCreate(id: misc.TFileId, funcName?: string): Promise<fsa.IFileSystemFileHandle> {
    if (typeof id === 'number') return (await this.getFileByFd(id, funcName)).file;
    const filename = pathToFilename(id);
    const [folder, name] = pathToLocation(filename);
    const dir = await this.getDir(folder, false, funcName);
    return await dir.getFileHandle(name, { create: true });
  }

  protected async __open(filename: string, flags: number, mode: number): Promise<FsaNodeFsOpenFile> {
    const [folder, name] = pathToLocation(filename);
    const createIfMissing = !!(flags & FLAG.O_CREAT);
    const fsaFile = await this.getFile(folder, name, 'open', createIfMissing);
    const fd = this.newFdNumber();
    const file = new FsaNodeFsOpenFile(fd, mode, flags, fsaFile);
    this.fds.set(fd, file);
    return file;
  }
}
