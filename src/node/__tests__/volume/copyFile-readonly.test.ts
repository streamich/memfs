import { create } from '../../../__tests__/util';

describe('copyFile readonly source file issue', () => {
  it('copyFileSync on readonly source file should be allowed', () => {
    // Arrange
    const vol = create({
      '/path/to/file.txt': 'some text',
    });

    vol.chmodSync('/path/to/file.txt', 0o400); // Readonly

    // Act - this should NOT throw
    vol.copyFileSync('/path/to/file.txt', '/path/to/another.txt');

    // Assert
    expect(vol.readFileSync('/path/to/file.txt', 'utf8')).toBe('some text');
    expect(vol.readFileSync('/path/to/another.txt', 'utf8')).toBe('some text');
  });

  it('copyFile on readonly source file should be allowed', done => {
    // Arrange
    const vol = create({
      '/path/to/file.txt': 'some text',
    });

    vol.chmodSync('/path/to/file.txt', 0o400); // Readonly

    // Act - this should NOT throw
    vol.copyFile('/path/to/file.txt', '/path/to/another.txt', err => {
      try {
        expect(err).toBeNull();
        expect(vol.readFileSync('/path/to/file.txt', 'utf8')).toBe('some text');
        expect(vol.readFileSync('/path/to/another.txt', 'utf8')).toBe('some text');
        done();
      } catch (failure) {
        done(failure);
      }
    });
  });
});