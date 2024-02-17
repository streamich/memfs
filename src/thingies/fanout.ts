export type FanOutUnsubscribe = () => void;
export type FanOutListener<D> = (data: D) => void;

export class FanOut<D> {
  public readonly listeners = new Set<FanOutListener<D>>();

  public emit(data: D): void {
    this.listeners.forEach(listener => listener(data));
  }

  public listen(listener: FanOutListener<D>): FanOutUnsubscribe {
    const listeners = this.listeners;
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
}
