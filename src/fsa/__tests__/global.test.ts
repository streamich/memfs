import { showOpenFilePicker, showSaveFilePicker, showDirectoryPicker, installGlobalFSAStubs } from '../global';

describe('File System API Global Functions', () => {
  describe('showOpenFilePicker', () => {
    it('should throw "not implemented" error', async () => {
      await expect(showOpenFilePicker()).rejects.toThrow('not implemented');
    });

    it('should throw "not implemented" error with options', async () => {
      await expect(showOpenFilePicker({ multiple: true })).rejects.toThrow('not implemented');
    });
  });

  describe('showSaveFilePicker', () => {
    it('should throw "not implemented" error', async () => {
      await expect(showSaveFilePicker()).rejects.toThrow('not implemented');
    });

    it('should throw "not implemented" error with options', async () => {
      await expect(showSaveFilePicker({ suggestedName: 'test.txt' })).rejects.toThrow('not implemented');
    });
  });

  describe('showDirectoryPicker', () => {
    it('should throw "not implemented" error', async () => {
      await expect(showDirectoryPicker()).rejects.toThrow('not implemented');
    });

    it('should throw "not implemented" error with options', async () => {
      await expect(showDirectoryPicker({ mode: 'readwrite' })).rejects.toThrow('not implemented');
    });
  });

  describe('installGlobalFSAStubs', () => {
    it('should install global functions on globalThis', () => {
      // Store original values if they exist
      const originalShowOpenFilePicker = (globalThis as any).showOpenFilePicker;
      const originalShowSaveFilePicker = (globalThis as any).showSaveFilePicker;
      const originalShowDirectoryPicker = (globalThis as any).showDirectoryPicker;

      try {
        installGlobalFSAStubs();

        expect(typeof (globalThis as any).showOpenFilePicker).toBe('function');
        expect(typeof (globalThis as any).showSaveFilePicker).toBe('function');
        expect(typeof (globalThis as any).showDirectoryPicker).toBe('function');
      } finally {
        // Restore original values
        if (originalShowOpenFilePicker !== undefined) {
          (globalThis as any).showOpenFilePicker = originalShowOpenFilePicker;
        } else {
          delete (globalThis as any).showOpenFilePicker;
        }
        if (originalShowSaveFilePicker !== undefined) {
          (globalThis as any).showSaveFilePicker = originalShowSaveFilePicker;
        } else {
          delete (globalThis as any).showSaveFilePicker;
        }
        if (originalShowDirectoryPicker !== undefined) {
          (globalThis as any).showDirectoryPicker = originalShowDirectoryPicker;
        } else {
          delete (globalThis as any).showDirectoryPicker;
        }
      }
    });

    it('should allow global functions to be called and throw "not implemented"', async () => {
      // Store original values
      const originalShowDirectoryPicker = (globalThis as any).showDirectoryPicker;

      try {
        installGlobalFSAStubs();

        await expect((globalThis as any).showDirectoryPicker()).rejects.toThrow('not implemented');
      } finally {
        // Restore original value
        if (originalShowDirectoryPicker !== undefined) {
          (globalThis as any).showDirectoryPicker = originalShowDirectoryPicker;
        } else {
          delete (globalThis as any).showDirectoryPicker;
        }
      }
    });
  });
});
