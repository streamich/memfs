jest.useFakeTimers('modern');

// Fixes https://github.com/streamich/memfs/issues/542
it('should throw error instead of callback', () => {
  const { Volume } = require('../../volume');
  const vol = new Volume();

  vol.writeFile('/asdf.txt', 'asdf', 'utf8', err => {
    if (!err) {
      throw new Error('try to trigger catch');
    }
  });

  expect(() => jest.runAllTimers()).toThrow('try to trigger catch');
});
