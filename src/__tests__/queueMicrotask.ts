import queueMicrotask from '../queueMicrotask';

describe('queueMicrotask', () => {
  it('Is a function', () => {
    expect(typeof queueMicrotask).toBe('function');
  });
  it('Execute callback on next event loop cycle', done => {
    queueMicrotask(done);
  });
});
