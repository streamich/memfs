import { DenoFsFile, DenoFileInfo, DenoSeekMode, DenoSetRawOptions } from './types';

export class CoreFsFile implements DenoFsFile {
  get readable(): ReadableStream<Uint8Array> {
    throw new Error('Not implemented');
  }

  get writable(): WritableStream<Uint8Array> {
    throw new Error('Not implemented');
  }

  write(p: Uint8Array): Promise<number> {
    throw new Error('Not implemented');
  }

  writeSync(p: Uint8Array): number {
    throw new Error('Not implemented');
  }

  truncate(len?: number): Promise<void> {
    throw new Error('Not implemented');
  }

  truncateSync(len?: number): void {
    throw new Error('Not implemented');
  }

  read(p: Uint8Array): Promise<number | null> {
    throw new Error('Not implemented');
  }

  readSync(p: Uint8Array): number | null {
    throw new Error('Not implemented');
  }

  seek(offset: number | bigint, whence: DenoSeekMode): Promise<number> {
    throw new Error('Not implemented');
  }

  seekSync(offset: number | bigint, whence: DenoSeekMode): number {
    throw new Error('Not implemented');
  }

  stat(): Promise<DenoFileInfo> {
    throw new Error('Not implemented');
  }

  statSync(): DenoFileInfo {
    throw new Error('Not implemented');
  }

  sync(): Promise<void> {
    throw new Error('Not implemented');
  }

  syncSync(): void {
    throw new Error('Not implemented');
  }

  syncData(): Promise<void> {
    throw new Error('Not implemented');
  }

  syncDataSync(): void {
    throw new Error('Not implemented');
  }

  utime(atime: number | Date, mtime: number | Date): Promise<void> {
    throw new Error('Not implemented');
  }

  utimeSync(atime: number | Date, mtime: number | Date): void {
    throw new Error('Not implemented');
  }

  isTerminal(): boolean {
    throw new Error('Not implemented');
  }

  setRaw(mode: boolean, options?: DenoSetRawOptions): void {
    throw new Error('Not implemented');
  }

  lock(exclusive?: boolean): Promise<void> {
    throw new Error('Not implemented');
  }

  lockSync(exclusive?: boolean): void {
    throw new Error('Not implemented');
  }

  unlock(): Promise<void> {
    throw new Error('Not implemented');
  }

  unlockSync(): void {
    throw new Error('Not implemented');
  }

  close(): void {
    throw new Error('Not implemented');
  }
}