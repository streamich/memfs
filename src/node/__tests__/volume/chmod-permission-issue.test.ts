import { create } from '../../../__tests__/util';
import { AMODE } from '../../../consts/AMODE';

describe('chmod 0 permission issue reproduction', () => {
  describe('existsSync()', () => {
    test('chmod on file and existsSync', () => {
      // Arrange
      const vol = create({ '/path/to/file.txt': 'some text' });
      vol.chmodSync('/path/to/file.txt', 0o0000);

      // Act
      const exists = vol.existsSync('/path/to/file.txt');
      const exists2 = vol.existsSync('/path/to/file2.txt');
      const exists3 = vol.existsSync('/path/to3/file3.txt');

      // Assert
      expect(exists).toBe(true);
      expect(exists2).toBe(false);
      expect(exists3).toBe(false);
    });

    test('chmod on directory and existsSync', () => {
      // Arrange
      const vol = create({ '/path/to/file.txt': 'some text' });
      vol.chmodSync('/path/to/', 0o0000);

      // Act
      const exists = vol.existsSync('/path/to/file.txt');

      // Assert
      expect(exists).toBe(false);
    });
  });

  test.each([AMODE.R_OK, AMODE.W_OK])('chmod on file and access mode %d', mode => {
    // Arrange
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.accessSync('/path/to/file.txt', mode);
    vol.chmodSync('/path/to/file.txt', 0o0000);

    // Act & Assert
    expect(() => {
      vol.accessSync('/path/to/file.txt', mode);
    }).toThrow();
  });

  test.each([AMODE.R_OK, AMODE.W_OK])('chmod on directory and access mode %d', mode => {
    // Arrange
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.accessSync('/path/to/file.txt', mode);
    vol.chmodSync('/path/to/', 0o0000);

    // Act & Assert
    expect(() => {
      vol.accessSync('/path/to/file.txt', mode);
    }).toThrow();
  });

  test('chmod on file and access F_OK should not throw', () => {
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.accessSync('/path/to/file.txt', AMODE.F_OK);
    vol.chmodSync('/path/to/file.txt', 0o0000);
    vol.accessSync('/path/to/file.txt', AMODE.F_OK);
  });

  // Test the exact scenario from the issue (https://github.com/streamich/memfs/issues/1172)
  test('chmod on file and promises access with fs.constants', async () => {
    const vol = create({ '/path/to/file.txt': 'some text' });
    
    await vol.promises.chmod('/path/to/file.txt', 0o0000);

    // Should throw for R_OK and W_OK
    await expect(vol.promises.access('/path/to/file.txt', AMODE.R_OK)).rejects.toThrow();
    await expect(vol.promises.access('/path/to/file.txt', AMODE.R_OK | AMODE.F_OK)).rejects.toThrow();
    await expect(vol.promises.access('/path/to/file.txt', AMODE.W_OK)).rejects.toThrow();
    await expect(vol.promises.access('/path/to/file.txt', AMODE.W_OK | AMODE.F_OK)).rejects.toThrow();
    await expect(vol.promises.access('/path/to/file.txt', AMODE.W_OK | AMODE.R_OK)).rejects.toThrow();
    await expect(vol.promises.access('/path/to/file.txt', AMODE.W_OK | AMODE.R_OK | AMODE.F_OK)).rejects.toThrow();
    
    // F_OK should NOT throw - it just checks existence, which it does exist
    await expect(vol.promises.access('/path/to/file.txt', AMODE.F_OK)).resolves.toBeUndefined();
  });
});
