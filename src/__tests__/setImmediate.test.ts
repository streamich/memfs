import setImmediate from '../setImmediate';

describe('setImmediate', () => {
  it('Is a function', () => {
    expect(typeof setImmediate).toBe('function');
  });
  it('Execute callback on next event loop cycle', done => {
    setImmediate(done);
  });
});
