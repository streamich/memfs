import { create } from '../../../__tests__/util';

describe('chmod 0 permission issue reproduction', () => {
  // ❌ FAILURE - should return false but returns true
  test('chmod on file and existsSync', () => {
    // Arrange
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.chmodSync('/path/to/file.txt', 0o0000);

    // Act
    const exists = vol.existsSync('/path/to/file.txt');

    // Assert
    expect(exists).toBe(false);
  });

  // ✅ SUCCESS - this should already work
  test('chmod on directory and existsSync', () => {
    // Arrange
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.chmodSync('/path/to/', 0o0000);

    // Act
    const exists = vol.existsSync('/path/to/file.txt');

    // Assert
    expect(exists).toBe(false);
  });

  // ❌ FAILURE - should throw but doesn't throw
  test.each([4 /* R_OK */, 2 /* W_OK */])('chmod on file and access mode %d', mode => {
    // Arrange
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.chmodSync('/path/to/file.txt', 0o0000);

    // Act & Assert
    expect(() => {
      vol.accessSync('/path/to/file.txt', mode);
    }).toThrow();
  });

  // ✅ SUCCESS - this should already work
  test.each([4 /* R_OK */, 2 /* W_OK */])('chmod on directory and access mode %d', mode => {
    // Arrange
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.chmodSync('/path/to/', 0o0000);

    // Act & Assert
    expect(() => {
      vol.accessSync('/path/to/file.txt', mode);
    }).toThrow();
  });

  // F_OK should NOT throw - it just checks existence
  test('chmod on file and access F_OK should not throw', () => {
    const vol = create({ '/path/to/file.txt': 'some text' });
    vol.chmodSync('/path/to/file.txt', 0o0000);

    // F_OK should not throw - file exists
    expect(() => {
      vol.accessSync('/path/to/file.txt', 0 /* F_OK */);
    }).not.toThrow();
  });

  // Test the exact scenario from the issue using promises API and fs constants
  test('chmod on file and promises access with fs.constants', async () => {
    const vol = create({ '/path/to/file.txt': 'some text' });
    
    await vol.promises.chmod('/path/to/file.txt', 0o0000);

    // Should throw for R_OK and W_OK
    await expect(vol.promises.access('/path/to/file.txt', 4 /* R_OK */)).rejects.toThrow();
    await expect(vol.promises.access('/path/to/file.txt', 2 /* W_OK */)).rejects.toThrow();
    
    // F_OK should NOT throw - it just checks existence, which it does exist
    await expect(vol.promises.access('/path/to/file.txt', 0 /* F_OK */)).resolves.toBeUndefined();
  });
});
