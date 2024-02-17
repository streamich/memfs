export interface CacheEntry<T> {
  t: number; // Time created.
  value: T;
}

const noop = () => {};

export class Cache<T> {
  ttl = 10000; // Time how long item is kept in cache without refreshing.
  evictionTime = 20000; // After this time item is evicted from cache.
  gcPeriod = 30000; // How often to run GC.
  maxEntries = 100000;

  private entries = 0; // Number of values in cache.
  public map = new Map<string, CacheEntry<T>>();
  private timer: any; // GC setTimeout Timer.

  constructor(public method: (key: string) => Promise<T> = noop as any) {}

  put(key: string, value: T) {
    const entry = {
      t: Date.now(),
      value,
    };
    if (this.map.get(key)) {
      this.map.set(key, entry);
    } else {
      this.map.set(key, entry);
      this.entries++;
    }
    if (this.entries > this.maxEntries) {
      for (const iterationKey of this.map.keys()) {
        if (key !== iterationKey) {
          this.map.delete(iterationKey);
          this.entries--;
          break;
        }
      }
    }
  }

  async getFromSource(key: string): Promise<T> {
    const value = await this.method(key);
    this.put(key, value);
    return value;
  }

  async get(key: string): Promise<T> {
    const entry = this.map.get(key);
    if (entry) {
      const now = Date.now();
      if (now - entry.t <= this.ttl) {
        return entry.value;
      } else if (now - entry.t <= this.evictionTime) {
        this.getFromSource(key).catch(noop);
        return entry.value;
      } else {
        this.map.delete(key);
        this.entries--;
        return await this.getFromSource(key);
      }
    } else {
      return await this.getFromSource(key);
    }
  }

  getSync(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    const now = Date.now();
    if (now - entry.t <= this.ttl) {
      return entry.value;
    } else if (now - entry.t <= this.evictionTime) {
      this.getFromSource(key).catch(noop);
      return entry.value;
    }
    return null;
  }

  exists(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    const now = Date.now();
    return now - entry.t <= this.evictionTime;
  }

  scheduleGC() {
    this.timer = setTimeout(this.runGC, this.gcPeriod);
    this.timer.unref();
  }

  startGC() {
    this.scheduleGC();
  }

  runGC = () => {
    const now = Date.now();
    for (const key of this.map.keys()) {
      const entry = this.map.get(key);
      if (entry && now - entry.t >= this.evictionTime) {
        this.map.delete(key);
        this.entries--;
      }
    }
    this.scheduleGC();
  };

  stopGC = () => {
    clearTimeout(this.timer);
  };

  retire(key: string, newTime: number = 0): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    entry.t = newTime;
    return true;
  }

  remove(key: string): boolean {
    const success = this.map.delete(key);
    if (success) this.entries--;
    return success;
  }
}
