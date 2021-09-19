import { create } from '../util';

describe('rmSync', () => {
  it('remove directory with two files', () => {
    const vol = create({
      '/foo/bar': 'baz',
      '/foo/baz': 'qux',
      '/oof': 'zab',
    });

    vol.rmSync('/foo', {force: true, recursive: true});

    expect(vol.toJSON()).toEqual({
      '/oof': 'zab',
    });
  });
});
