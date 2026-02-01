import { create } from '../util';

describe('Volume.cwd', () => {
  it('Supports absolute path changes', () => {
    const vol = create(
      {
        '/file': 'root',
        '/a/file': 'a',
        '/a/b/file': 'b',
      },
      {
        cwd: '/',
      },
    );
    expect(vol.readFileSync('./file', 'utf8')).toEqual('root');
    vol.cwd = '/a';
    expect(vol.readFileSync('./file', 'utf8')).toEqual('a');
    vol.cwd = '/a/b';
    expect(vol.readFileSync('./file', 'utf8')).toEqual('b');
  });
  it('Supports relative path changes', () => {
    const vol = create(
      {
        file: 'root',
        'a/file': 'a',
        'a/b/file': 'b',
      },
      {
        cwd: process.cwd(),
      },
    );
    expect(vol.readFileSync('./file', 'utf8')).toEqual('root');
    vol.cwd = 'a';
    expect(vol.readFileSync('./file', 'utf8')).toEqual('a');
    vol.cwd = 'a/b';
    expect(vol.readFileSync('./file', 'utf8')).toEqual('b');
  });
});
