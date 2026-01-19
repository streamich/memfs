import setTimeoutUnref from '../setTimeoutUnref';

describe('setTimeoutUnref', () => {
  it('Executes callback', done => {
    setTimeoutUnref(done);
  });
});
