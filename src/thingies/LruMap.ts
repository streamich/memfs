export class LruMap<K, V> extends Map<K, V> {
  constructor(public readonly limit: number = Infinity) {
    super();
  }

  public set(key: K, value: V): this {
    super.set(key, value);
    if (this.size > this.limit) this.delete(super.keys().next().value);
    return this;
  }

  public get(key: K): V | undefined {
    if (!super.has(key)) return undefined;
    const value = super.get(key)!;
    super.delete(key);
    super.set(key, value);
    return value;
  }
}
