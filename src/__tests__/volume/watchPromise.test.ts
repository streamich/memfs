import { create } from '../util';

describe('promises.watch(path, options)', () => {
  it('emits filesystem events', async () => {
    const vol = create({foo: 'a'});
    // const iterator = vol.promises.watch('/foo', {});

    // console.log(iterator);
  });
});
