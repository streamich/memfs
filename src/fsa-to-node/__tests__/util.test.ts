import { pathToLocation } from '../util';

describe('pathToLocation()', () => {
  test('handles an empty string', () => {
    expect(pathToLocation('')).toStrictEqual([[], '']);
  });

  test('handles a single slash', () => {
    expect(pathToLocation('/')).toStrictEqual([[], '']);
  });

  test('no path, just filename', () => {
    expect(pathToLocation('scary.exe')).toStrictEqual([[], 'scary.exe']);
  });

  test('strips trailing slash', () => {
    expect(pathToLocation('scary.exe/')).toStrictEqual([[], 'scary.exe']);
  });

  test('multiple steps in the path', () => {
    expect(pathToLocation('/gg/wp/hf/gl.txt')).toStrictEqual([['gg', 'wp', 'hf'], 'gl.txt']);
    expect(pathToLocation('gg/wp/hf/gl.txt')).toStrictEqual([['gg', 'wp', 'hf'], 'gl.txt']);
    expect(pathToLocation('/wp/hf/gl.txt')).toStrictEqual([['wp', 'hf'], 'gl.txt']);
    expect(pathToLocation('wp/hf/gl.txt')).toStrictEqual([['wp', 'hf'], 'gl.txt']);
    expect(pathToLocation('/hf/gl.txt')).toStrictEqual([['hf'], 'gl.txt']);
    expect(pathToLocation('hf/gl.txt')).toStrictEqual([['hf'], 'gl.txt']);
    expect(pathToLocation('/gl.txt')).toStrictEqual([[], 'gl.txt']);
    expect(pathToLocation('gl.txt')).toStrictEqual([[], 'gl.txt']);
  });

  test('handles double slashes', () => {
    expect(pathToLocation('/gg/wp//hf/gl.txt')).toStrictEqual([['gg', 'wp', '', 'hf'], 'gl.txt']);
    expect(pathToLocation('//gl.txt')).toStrictEqual([[''], 'gl.txt']);
  });
});
