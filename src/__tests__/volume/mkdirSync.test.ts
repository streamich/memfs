import { create } from '../util';

describe('mkdirSync', () => {
  it('can create a directory', () => {
    const vol = create();

    vol.mkdirSync('/new-dir');
    const stat = vol.statSync('/new-dir');

    expect(stat.isDirectory()).toBe(true);
  });

  it('root directory is directory', () => {
    const vol = create();
    const stat = vol.statSync('/');

    expect(stat.isDirectory()).toBe(true);
  });

  it('throws when re-creating existing directory', () => {
    const vol = create();

    vol.mkdirSync('/new-dir');

    let error;
    try {
      vol.mkdirSync('/new-dir');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });

  /**
   * See issue #325
   * https://github.com/streamich/memfs/issues/325
   */
  it('throws when creating root directory', () => {
    const vol = create();

    let error;
    try {
      vol.mkdirSync('/');
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatchSnapshot();
  });
});
