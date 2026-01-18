import { FileLockManager } from '../FileLockManager';

describe('FileLockManager', () => {
  let lockManager: FileLockManager;

  beforeEach(() => {
    lockManager = new FileLockManager();
  });

  describe('acquireLock', () => {
    test('should acquire lock on new path', () => {
      const result = lockManager.acquireLock('/test.txt');
      expect(result).toBe(true);
    });

    test('should return false if path is already locked', () => {
      lockManager.acquireLock('/test.txt');
      const result = lockManager.acquireLock('/test.txt');
      expect(result).toBe(false);
    });

    test('should handle multiple different paths independently', () => {
      const result1 = lockManager.acquireLock('/file1.txt');
      const result2 = lockManager.acquireLock('/file2.txt');
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });

  describe('releaseLock', () => {
    test('should release previously acquired lock', () => {
      lockManager.acquireLock('/test.txt');
      lockManager.releaseLock('/test.txt');
      expect(lockManager.isLocked('/test.txt')).toBe(false);
    });

    test('should allow re-acquiring after release', () => {
      lockManager.acquireLock('/test.txt');
      lockManager.releaseLock('/test.txt');
      const result = lockManager.acquireLock('/test.txt');
      expect(result).toBe(true);
    });

    test('should handle release of non-existent locks gracefully', () => {
      expect(() => lockManager.releaseLock('/nonexistent.txt')).not.toThrow();
    });
  });

  describe('isLocked', () => {
    test('should return false for unlocked path', () => {
      expect(lockManager.isLocked('/test.txt')).toBe(false);
    });

    test('should return true for locked path', () => {
      lockManager.acquireLock('/test.txt');
      expect(lockManager.isLocked('/test.txt')).toBe(true);
    });

    test('should return false after lock is released', () => {
      lockManager.acquireLock('/test.txt');
      lockManager.releaseLock('/test.txt');
      expect(lockManager.isLocked('/test.txt')).toBe(false);
    });
  });

  describe('clear', () => {
    test('should release all locks', () => {
      lockManager.acquireLock('/file1.txt');
      lockManager.acquireLock('/file2.txt');
      lockManager.acquireLock('/file3.txt');

      lockManager.clear();

      expect(lockManager.isLocked('/file1.txt')).toBe(false);
      expect(lockManager.isLocked('/file2.txt')).toBe(false);
      expect(lockManager.isLocked('/file3.txt')).toBe(false);
    });

    test('should allow re-acquiring after clear', () => {
      lockManager.acquireLock('/test.txt');
      lockManager.clear();
      const result = lockManager.acquireLock('/test.txt');
      expect(result).toBe(true);
    });
  });
});
