import { createFs } from '../../../__tests__/util';

describe('readFileSync error handling', () => {
  it('throws ENOTDIR when trying to read through a file on non-Windows platforms', () => {
    const originalPlatform = process.platform;
    
    // Mock non-Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true
    });
    
    try {
      const fs = createFs();
      fs.writeFileSync('/foo', 'hello');
      
      expect(() => {
        fs.readFileSync('/foo/bar');
      }).toThrow(/ENOTDIR/);
    } finally {
      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    }
  });

  it('throws ENOENT when trying to read through a file on Windows platform', () => {
    const originalPlatform = process.platform;
    
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      configurable: true
    });
    
    try {
      const fs = createFs();
      fs.writeFileSync('/foo', 'hello');
      
      expect(() => {
        fs.readFileSync('/foo/bar');
      }).toThrow(/ENOENT/);
    } finally {
      // Restore original platform
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        configurable: true
      });
    }
  });
});