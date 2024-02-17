/**
 * TimedState works similar to TimedQueue, but instead of saving
 * a list of all items pushed, it reduces the state on each push.
 */
export class TimedState<S, I> {
  /**
   * State will be flushed when it reaches this number of items.
   */
  public itemLimit: number = 100;

  /**
   * State will be flushed after this many milliseconds.
   */
  public timeLimit: number = 5_000;

  /**
   * Method that will be called when state is flushed.
   */
  public onFlush: (state: S) => void = () => {};

  constructor(protected readonly initState: () => S, protected readonly reducer: (state: S, item: I) => S) {}

  protected length: number = 0;
  protected state: S = this.initState();
  private timer: any = null;

  push(item: I): void {
    this.length++;
    this.state = this.reducer(this.state, item);
    if (this.length >= this.itemLimit) {
      this.flush();
      return;
    }
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.timeLimit);
    }
  }

  flush(): S {
    const {state, length} = this;
    this.state = this.initState();
    this.length = 0;
    if (this.timer) clearTimeout(this.timer);
    if (length) {
      this.timer = null;
      try {
        this.onFlush(state);
      } catch (error) {
        // tslint:disable-next-line
        console.error('TimedState', error);
      }
    }
    return state;
  }
}
