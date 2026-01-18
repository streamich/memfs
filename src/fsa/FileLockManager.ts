export class FileLockManager {
  private locks: Map<string, boolean> = new Map();

  public acquireLock(path: string): boolean {
    if (this.locks.get(path)) {
      return false;
    }
    this.locks.set(path, true);
    return true;
  }

  public releaseLock(path: string): void {
    this.locks.delete(path);
  }

  public isLocked(path: string): boolean {
    return this.locks.get(path) ?? false;
  }

  public clear(): void {
    this.locks.clear();
  }
}
