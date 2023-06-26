import { basename } from '../util';

describe('basename()', () => {
  test('handles empty string', () => {
    expect(basename('', '/')).toBe('');
  });

  test('return the same string if there is no nesting', () => {
    expect(basename('scary.exe', '/')).toBe('scary.exe');
  });

  test('ignores slash, if it is the last char', () => {
    expect(basename('scary.exe/', '/')).toBe('scary.exe');
    expect(basename('/ab/c/scary.exe/', '/')).toBe('scary.exe');
  });

  test('returns last step in path', () => {
    expect(basename('/gg/wp/hf/gl.txt', '/')).toBe('gl.txt');
    expect(basename('gg/wp/hf/gl.txt', '/')).toBe('gl.txt');
    expect(basename('/wp/hf/gl.txt', '/')).toBe('gl.txt');
    expect(basename('wp/hf/gl.txt', '/')).toBe('gl.txt');
    expect(basename('/hf/gl.txt', '/')).toBe('gl.txt');
    expect(basename('hf/gl.txt', '/')).toBe('gl.txt');
    expect(basename('/gl.txt', '/')).toBe('gl.txt');
    expect(basename('gl.txt', '/')).toBe('gl.txt');
  });

  test('handles double slashes', () => {
    expect(basename('/gg/wp/hf//gl.txt', '/')).toBe('gl.txt');
    expect(basename('//gl.txt', '/')).toBe('gl.txt');
  });
});
