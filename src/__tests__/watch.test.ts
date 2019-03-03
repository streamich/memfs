import { Volume } from '../volume';

describe("watching files", () => {
  it("Should only call the watcher once on .writeFile", done => {
    const spy = jest.fn();
    const vol = new Volume();
    vol.writeFileSync('/watcher.txt', '1');
    let count = 1;
    vol.watch('/watcher.txt', (...args) => {
      console.log("watched updated", count++, new Error().stack);
      return spy(...args);
    });
    
    // update some content
    vol.writeFileSync("/watcher.txt", "2");
    setTimeout(() => {
      expect(spy).toHaveBeenCalledTimes(1);
    }, 2500);
  
  });
});