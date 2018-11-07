import { create } from '../util';

describe('existsSync(path)', () => {
  const vol = create();
  it('Returns true if file exists', () => {
    const result = vol.existsSync('/foo');
    expect(result).toEqual(true);
  });
  it('Returns false if file does not exist', () => {
    const result = vol.existsSync('/foo2');
    expect(result).toEqual(false);
  });
  it('invalid path type should not throw', () => {
    expect(vol.existsSync(123 as any)).toEqual(false);
  });
});
