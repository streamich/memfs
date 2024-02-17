/**
 * Queue that is flushed automatically when it reaches some item limit
 * or when timeout is reached.
 */
export class TimedQueue<T> {
  /**
   * Queue will be flushed when it reaches this number of items.
   */
  itemLimit: number = 100;

  /**
   * Queue will be flushed after this many milliseconds.
   */
  timeLimit: number = 5_000;

  /**
   * Method that will be called when queue is flushed.
   */
  onFlush = (list: T[]) => {};

  private list: T[] = [];
  private timer: any = null;

  push(item: T) {
    this.list.push(item);
    if (this.list.length >= this.itemLimit) {
      this.flush();
      return;
    }
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.timeLimit);
    }
  }

  flush(): T[] {
    const list = this.list;
    this.list = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (list.length) {
      try {
        this.onFlush(list);
      } catch (error) {
        // tslint:disable-next-line
        console.error('TimedQueue', error);
      }
    }
    return list;
  }
}
