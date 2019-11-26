import { create } from '../util';

describe('toString', () => {
  it('allow files to be named "toString", #463', () => {
    const vol = create({});
    vol.writeFileSync('/toString', 'pwned');

    expect(vol.readFileSync('/toString', 'utf8')).toBe('pwned');
    expect(vol.toJSON()).toEqual({
      '/toString': 'pwned',
    });
  });
});
