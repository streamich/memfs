import { StorageManagerFSAExtension, DataTransferItemFSAExtension, installBrowserFSAExtensions } from '../extensions';

describe('File System API Browser Extensions', () => {
  describe('StorageManagerFSAExtension', () => {
    it('should throw "not implemented" error for getDirectory', async () => {
      const extension = new StorageManagerFSAExtension();
      await expect(extension.getDirectory()).rejects.toThrow('not implemented');
    });
  });

  describe('DataTransferItemFSAExtension', () => {
    it('should throw "not implemented" error for getAsFileSystemHandle', async () => {
      const extension = new DataTransferItemFSAExtension();
      await expect(extension.getAsFileSystemHandle()).rejects.toThrow('not implemented');
    });
  });

  describe('installBrowserFSAExtensions', () => {
    it('should install extensions safely when browser objects do not exist', () => {
      // This test ensures the function doesn't throw when browser objects don't exist (like in Node.js)
      expect(() => installBrowserFSAExtensions()).not.toThrow();
    });

    // Note: We can't easily test the actual installation of extensions on browser objects
    // in a Node.js test environment since StorageManager and DataTransferItem don't exist.
    // In a real browser environment, these would be installed on the prototypes.
  });
});
