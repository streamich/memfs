import { create } from '../util';

describe('.realpathSync(...)', () => {
  it('works with symlinks, #463', () => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    const path = vol.realpathSync('/a/b/index.js');
    expect(path).toBe('/c/index.js');
  });
});

describe("edge case -- realpathSync('/') returns '/'", () => {
  const vol = create({'./a':'a'});
  expect(vol.realpathSync('/')).toBe('/');
});