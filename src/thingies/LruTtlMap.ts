import {LruMap} from './LruMap';

export class LruTtlMap<K, V> extends LruMap<K, V> {
  private readonly expiry = new Map<K, number>();

  public clear(): void {
    this.expiry.clear();
    super.clear();
  }

  public delete(key: K): boolean {
    this.expiry.delete(key);
    return super.delete(key);
  }

  public has(key: K, now: number = 0): boolean {
    if (!super.has(key)) return false;
    const expiry = this.expiry.get(key) || 0;
    const expired = now > expiry;
    if (expired) this.delete(key);
    return !expired;
  }

  public get(key: K, now?: number): V | undefined {
    if (!this.has(key, now)) return undefined;
    const value = super.get(key)!;
    super.set(key, value);
    return value;
  }

  public set(key: K, value: V, expiry: number = Infinity): this {
    super.set(key, value);
    this.expiry.set(key, expiry);
    return this;
  }
}
