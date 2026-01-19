import { createError, pathToFilename } from '../node/util';
import { pathToLocation } from './util';
import { ERRSTR } from '@jsonjoy.com/node-fs-utils';
import { FsaToNodeConstants } from './constants';
import { FsaNodeFsOpenFile } from './FsaNodeFsOpenFile';
import { FLAG_CON } from '../consts/FLAG';
import * as util from '../node/util';
import type * as fsa from '@jsonjoy.com/fs-fsa';
import type * as misc from '@jsonjoy.com/node-fs-utils/lib/types/misc';
import type { FsaNodeSyncAdapter } from './types';
import { isFd } from '@jsonjoy.com/fs-core';

export class FsaNodeCore {
  protected static fd: number = 0x7fffffff;
  protected readonly fds = new Map<number, FsaNodeFsOpenFile>();

  public constructor(
    protected readonly root: fsa.IFileSystemDirectoryHandle | Promise<fsa.IFileSystemDirectoryHandle>,
    public syncAdapter?: FsaNodeSyncAdapter,
  ) {
    if (root instanceof Promise) {
      root
        .then(root => {
          (this as any).root = root;
        })
        .catch(error => {});
    }
  }

  protected getSyncAdapter(): FsaNodeSyncAdapter {
    const adapter = this.syncAdapter;
    if (!adapter) throw new Error('No sync adapter');
    return adapter;
  }

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
    let curr: fsa.IFileSystemDirectoryHandle = await this.root;
    const options: fsa.GetDirectoryHandleOptions = { create };
    try {
      for (const name of path) {
        curr = await curr.getDirectoryHandle(name, options);
      }
    } catch (error) {
      if (error && typeof error === 'object') {
        switch (error.name) {
          case 'TypeMismatchError':
            throw createError('ENOTDIR', funcName, path.join(FsaToNodeConstants.Separator));
          case 'NotFoundError':
            throw createError('ENOENT', funcName, path.join(FsaToNodeConstants.Separator));
        }
      }
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
  ): Promise<fsa.IFileSystemFileHandle | fsa.IFileSystemDirectoryHandle> {
    const dir = await this.getDir(path, false, funcName);
    if (!name) return dir;
    try {
      const file = await dir.getFileHandle(name);
      return file;
    } catch (error) {
      if (error && typeof error === 'object') {
        switch (error.name) {
          case 'TypeMismatchError':
            try {
              return await dir.getDirectoryHandle(name);
            } catch (error2) {
              if (error2 && typeof error2 === 'object') {
                switch (error2.name) {
                  case 'TypeMismatchError':
                    throw createError('EISDIR', funcName, path.join(FsaToNodeConstants.Separator));
                  case 'NotFoundError':
                    throw createError('ENOENT', funcName, path.join(FsaToNodeConstants.Separator));
                }
              }
            }
          case 'NotFoundError':
            throw createError('ENOENT', funcName, path.join(FsaToNodeConstants.Separator));
        }
      }
      throw error;
    }
  }

  protected getFileByFd(fd: number, funcName?: string): FsaNodeFsOpenFile {
    if (!isFd(fd)) throw TypeError(ERRSTR.FD);
    const file = this.fds.get(fd);
    if (!file) throw createError('EBADF', funcName);
    return file;
  }

  protected async getFileByFdAsync(fd: number, funcName?: string): Promise<FsaNodeFsOpenFile> {
    return this.getFileByFd(fd, funcName);
  }

  public async __getFileById(id: misc.TFileId, funcName?: string): Promise<fsa.IFileSystemFileHandle> {
    if (typeof id === 'number') return (await this.getFileByFd(id, funcName)).file;
    const filename = pathToFilename(id);
    const [folder, name] = pathToLocation(filename);
    return await this.getFile(folder, name, funcName);
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
    const throwIfExists = !!(flags & FLAG_CON.O_EXCL);
    if (throwIfExists) {
      try {
        await this.getFile(folder, name, 'open', false);
        throw util.createError('EEXIST', 'writeFile');
      } catch (error) {
        const file404 =
          error && typeof error === 'object' && (error.code === 'ENOENT' || error.name === 'NotFoundError');
        if (!file404) {
          if (error && typeof error === 'object') {
            switch (error.name) {
              case 'TypeMismatchError':
                throw createError('EISDIR', 'open', filename);
              case 'NotFoundError':
                throw createError('ENOENT', 'open', filename);
            }
          }
          throw error;
        }
      }
    }
    try {
      const createIfMissing = !!(flags & FLAG_CON.O_CREAT);
      const fsaFile = await this.getFile(folder, name, 'open', createIfMissing);
      return this.__open2(fsaFile, filename, flags, mode);
    } catch (error) {
      if (error && typeof error === 'object') {
        switch (error.name) {
          case 'TypeMismatchError':
            throw createError('EISDIR', 'open', filename);
          case 'NotFoundError':
            throw createError('ENOENT', 'open', filename);
        }
      }
      throw error;
    }
  }

  protected __open2(
    fsaFile: fsa.IFileSystemFileHandle,
    filename: string,
    flags: number,
    mode: number,
  ): FsaNodeFsOpenFile {
    const fd = this.newFdNumber();
    const file = new FsaNodeFsOpenFile(fd, mode, flags, fsaFile, filename);
    this.fds.set(fd, file);
    return file;
  }

  protected async __close(fd: number): Promise<void> {
    const openFile = await this.getFileByFdAsync(fd, 'close');
    await openFile.close();
    const deleted = this.fds.delete(fd);
    if (deleted) this.releasedFds.push(fd);
  }

  protected getFileName(id: misc.TFileId): string {
    if (typeof id === 'number') {
      const openFile = this.fds.get(id);
      if (!openFile) throw createError('EBADF', 'readFile');
      return openFile.filename;
    }
    return pathToFilename(id);
  }
}
