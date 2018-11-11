import { fs } from '../..';

describe('openSync(path, mode[, flags])', () => {
  it('should return a file descriptor', () => {
    const fd = fs.openSync('/foo', 'w');
    expect(typeof fd).toEqual('number');
  });
});
