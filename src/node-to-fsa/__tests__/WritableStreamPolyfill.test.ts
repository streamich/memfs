/**
 * Test for WritableStream polyfill issue fix
 * This test simulates the Jest environment where WritableStream is not globally available
 */

describe('WritableStream polyfill', () => {
  test('nodeToFsa should be importable without global WritableStream', () => {
    // Store original WritableStream
    const originalWritableStream = (global as any).WritableStream;
    
    try {
      // Remove WritableStream to simulate Jest environment without it
      delete (global as any).WritableStream;

      // This should not throw even when WritableStream is not globally available
      expect(() => {
        // Force require to reload the module
        delete require.cache[require.resolve('../index')];
        delete require.cache[require.resolve('../NodeFileSystemWritableFileStream')];
        delete require.cache[require.resolve('../NodeFileSystemFileHandle')];
        delete require.cache[require.resolve('../NodeFileSystemDirectoryHandle')];
        
        const { nodeToFsa } = require('../index');
        expect(typeof nodeToFsa).toBe('function');
      }).not.toThrow();
    } finally {
      // Always restore original state
      if (originalWritableStream) {
        (global as any).WritableStream = originalWritableStream;
      }
    }
  });
});