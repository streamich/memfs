import { create } from '../util';

describe('.statSync(...)', () => {
  it('works with symlinks, #463', () => {
    const vol = create({});
    vol.mkdirSync('/a');
    vol.mkdirSync('/c');
    vol.writeFileSync('/c/index.js', 'alert(123);');
    vol.symlinkSync('/c', '/a/b');

    const stats = vol.statSync('/a/b/index.js');
    expect(stats.size).toBe(11);
  });
});
