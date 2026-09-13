import { posix } from '@jsonjoy.com/fs-node-builtins/lib/path';
import { URL } from '@jsonjoy.com/fs-node-builtins/lib/url';
import { invalidArgType, invalidUrlScheme, withCode } from '@jsonjoy.com/fs-node-utils/lib/argErrors';
import {
  validateBoolean,
  validateObject,
  validateString,
  validateStringArray,
} from '@jsonjoy.com/fs-node-utils/lib/validators';
import { expandBraces, toRegex } from 'glob-to-regex.js';
import { pathToFilename } from './util';
import Dirent from './Dirent';

const { basename, dirname, isAbsolute, join, resolve } = posix;

const internalAssertionError = (): Error =>
  withCode(
    new Error(
      'This is caused by either a bug in Node.js or incorrect usage of Node.js internals.\n' +
        'Please open an issue with this stack trace at https://github.com/nodejs/node/issues\n',
    ),
    'ERR_INTERNAL_ASSERTION',
  );

const validateStringArrayOrFunction = (value: unknown, name: string): void => {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++)
      if (typeof value[i] !== 'string') throw invalidArgType(name + '[' + i + ']', 'of type string', value[i]);
    return;
  }
  if (typeof value !== 'function') throw invalidArgType(name, 'of type function or string[]', value);
};

const toPathIfFileURL = (value: unknown): unknown => {
  if (!(value instanceof URL)) return value;
  if (value.protocol !== 'file:') throw invalidUrlScheme('file');
  return pathToFilename(value as any);
};

type Part = string | typeof GLOBSTAR | RegExp;

const GLOBSTAR = Symbol('globstar **');
const MAGIC = /[*?[]|[!+@]\(/;
const OPTS = { extglob: true, dot: false };

const parsePart = (part: string): Part => {
  if (part === '**') return GLOBSTAR;
  if (!MAGIC.test(part)) return part;
  return toRegex(part, OPTS);
};

/**
 * - drops `.`
 * - drops empty components
 * - collapses adjacent `**`
 * - resolves a `..` that follows an ordinary component
 */
const firstPhasePreProcess = (globParts: string[][]): string[][] => {
  let didSomething = false;
  do {
    didSomething = false;
    for (let n = 0; n < globParts.length; n++) {
      const parts = globParts[n];
      let gs = -1;
      while (-1 !== (gs = parts.indexOf('**', gs + 1))) {
        let gss = gs;
        while (parts[gss + 1] === '**') gss++;
        if (gss > gs) parts.splice(gs + 1, gss - gs);
        const next = parts[gs + 1];
        const p = parts[gs + 2];
        const p2 = parts[gs + 3];
        if (next !== '..') continue;
        if (!p || p === '.' || p === '..' || !p2 || p2 === '.' || p2 === '..') continue;
        didSomething = true;
        parts.splice(gs, 1);
        const other = parts.slice(0);
        other[gs] = '**';
        globParts.push(other);
        gs--;
      }
      for (let i = 1; i < parts.length - 1; i++) {
        const p = parts[i];
        if (i === 1 && p === '' && parts[0] === '') continue;
        if (p === '.' || p === '') {
          didSomething = true;
          parts.splice(i, 1);
          i--;
        }
      }
      if (parts[0] === '.' && parts.length === 2 && (parts[1] === '.' || parts[1] === '')) {
        didSomething = true;
        parts.pop();
      }
      let dd = 0;
      while (-1 !== (dd = parts.indexOf('..', dd + 1))) {
        const p = parts[dd - 1];
        if (p && p !== '.' && p !== '..' && p !== '**') {
          didSomething = true;
          const needDot = dd === 1 && parts[dd + 1] === '**';
          parts.splice(dd - 1, 2, ...(needDot ? ['.'] : []));
          if (!parts.length) parts.push('');
          dd -= 2;
        }
      }
    }
  } while (didSomething);
  return globParts;
};

const partsMatch = (a: string[], b: string[]): string[] | false => {
  let ai = 0;
  let bi = 0;
  const result: string[] = [];
  let which = '';
  while (ai < a.length && bi < b.length) {
    if (a[ai] === b[bi]) {
      result.push(which === 'b' ? b[bi] : a[ai]);
      ai++;
      bi++;
    } else if (a[ai] === '**' && b[bi] === a[ai + 1]) {
      result.push(a[ai]);
      ai++;
    } else if (b[bi] === '**' && a[ai] === b[bi + 1]) {
      result.push(b[bi]);
      bi++;
    } else if (a[ai] === '*' && b[bi] && !b[bi].startsWith('.') && b[bi] !== '**') {
      if (which === 'b') return false;
      which = 'a';
      result.push(a[ai]);
      ai++;
      bi++;
    } else if (b[bi] === '*' && a[ai] && !a[ai].startsWith('.') && a[ai] !== '**') {
      if (which === 'a') return false;
      which = 'b';
      result.push(b[bi]);
      ai++;
      bi++;
    } else return false;
  }
  return a.length === b.length && result;
};

const secondPhasePreProcess = (globParts: string[][]): string[][] => {
  for (let i = 0; i < globParts.length - 1; i++) {
    for (let j = i + 1; j < globParts.length; j++) {
      const matched = partsMatch(globParts[i], globParts[j]);
      if (matched) {
        globParts[i] = [];
        globParts[j] = matched;
        break;
      }
    }
  }
  return globParts.filter(parts => parts.length);
};

const compile = (pattern: string): [set: Part[][], globParts: string[][]] => {
  const source = pattern.replace(/\\/g, '/');
  if (!source) return [[], []];
  const globSet = [...new Set(expandBraces(source))];
  const globParts = secondPhasePreProcess(firstPhasePreProcess(globSet.map(one => one.split(/\/+/))));
  return [globParts.map(parts => parts.map(parsePart)), globParts];
};

const createExcludeMatcher = (patterns: string[], root: string): ((value: string) => boolean) => {
  const regexes: RegExp[] = [];
  for (let i = 0; i < patterns.length; i++) regexes.push(toRegex(resolve(root, patterns[i].replace(/\\/g, '/')), OPTS));
  return (value: string): boolean => {
    for (let i = 0; i < regexes.length; i++) if (regexes[i].test(value)) return true;
    return false;
  };
};

class Pattern {
  public readonly last: number;

  constructor(
    protected readonly parts: Part[],
    protected readonly globStrings: string[],
    public readonly indexes: Set<number>,
    public readonly symlinks: Set<number>,
    public readonly realpaths: Set<string> = new Set(),
  ) {
    this.last = parts.length - 1;
  }

  public isLast(isDirectory: boolean): boolean {
    return (
      this.indexes.has(this.last) ||
      (this.at(-1) === '' && isDirectory && this.indexes.has(this.last - 1) && this.at(-2) === GLOBSTAR)
    );
  }

  public isFirst(): boolean {
    return this.indexes.has(0);
  }

  public get hasSeenSymlinks(): boolean {
    for (const index of this.indexes) if (!this.symlinks.has(index)) return true;
    return false;
  }

  public at(index: number): Part | undefined {
    const parts = this.parts;
    return parts[index < 0 ? parts.length + index : index];
  }

  public child(indexes: Set<number>, symlinks = new Set<number>(), realpaths = this.realpaths): Pattern {
    return new Pattern(this.parts, this.globStrings, indexes, symlinks, realpaths);
  }

  public test(index: number, path: string): boolean {
    const part = this.parts[index];
    if (part === GLOBSTAR) return true;
    if (typeof part === 'string') return part === path;
    return part !== undefined && part.test(path);
  }

  public cacheKey(index: number): string {
    const globStrings = this.globStrings;
    const length = globStrings.length;
    let key = '';
    for (let i = index; i < length; i++) {
      key += globStrings[i];
      if (i !== length - 1) key += '/';
    }
    return key;
  }
}

interface GlobFs {
  lstatSync(path: string): { mode: number };
  statSync(path: string): { mode: number };
  realpathSync(path: string): unknown;
  readdirSync(path: string, options: { withFileTypes: true }): unknown[];
}

const rethrowUnlessFsError = (error: unknown): void => {
  if (!(error as { code?: string })?.code) throw error;
};

const direntOf = (name: string, parentPath: string, mode: number): Dirent => {
  const dirent = new Dirent();
  dirent.name = name;
  dirent.parentPath = parentPath;
  dirent.path = parentPath;
  (dirent as any).mode = mode;
  return dirent;
};

class Cache {
  protected readonly stats = new Map<string, Dirent | null>();
  protected readonly followStats = new Map<string, Dirent | null>();
  protected readonly realpaths = new Map<string, string | null>();
  protected readonly readdirs = new Map<string, Dirent[]>();
  protected readonly seenKeys = new Map<string, Set<string>>();

  constructor(protected readonly fs: GlobFs) {}

  public statSync(path: string): Dirent | null {
    const cached = this.stats.get(path);
    if (cached !== undefined) return cached;
    let value: Dirent | null = null;
    try {
      value = direntOf(basename(path), dirname(path), this.fs.lstatSync(path).mode);
    } catch (error) {
      rethrowUnlessFsError(error);
    }
    this.stats.set(path, value);
    return value;
  }

  public followStatSync(path: string): Dirent | null {
    const cached = this.followStats.get(path);
    if (cached !== undefined) return cached;
    let value: Dirent | null = null;
    try {
      value = direntOf(basename(path), dirname(path), this.fs.statSync(path).mode);
    } catch (error) {
      rethrowUnlessFsError(error);
    }
    this.followStats.set(path, value);
    return value;
  }

  public realpathSync(path: string): string | null {
    const cached = this.realpaths.get(path);
    if (cached !== undefined) return cached;
    let value: string | null = null;
    try {
      value = String(this.fs.realpathSync(path));
    } catch (error) {
      rethrowUnlessFsError(error);
    }
    this.realpaths.set(path, value);
    return value;
  }

  public readdirSync(path: string): Dirent[] {
    const cached = this.readdirs.get(path);
    if (cached !== undefined) return cached;
    let value: Dirent[] = [];
    try {
      value = this.fs.readdirSync(path, { withFileTypes: true }) as Dirent[];
    } catch (error) {
      rethrowUnlessFsError(error);
    }
    this.readdirs.set(path, value);
    return value;
  }

  public addToStatCache(path: string, value: Dirent): void {
    this.stats.set(path, value);
  }

  public add(path: string, pattern: Pattern): boolean {
    let keys = this.seenKeys.get(path);
    if (!keys) {
      keys = new Set();
      this.seenKeys.set(path, keys);
    }
    const originalSize = keys.size;
    for (const index of pattern.indexes) keys.add(pattern.cacheKey(index));
    return keys.size !== originalSize + pattern.indexes.size;
  }

  public seen(path: string, pattern: Pattern, index: number): boolean {
    return !!this.seenKeys.get(path)?.has(pattern.cacheKey(index));
  }
}

export interface GlobOptions {
  /** Directory relative patterns are resolved against and matches are reported from. */
  cwd?: string | URL;
  /** Glob patterns to drop, or a predicate consulted while descending. */
  exclude?: string[] | ((entry: string | Dirent) => boolean);
  /** Report each match as a `Dirent` instead of a path. */
  withFileTypes?: boolean;
  /** Descend symlinks to directories, stopping at a cycle. */
  followSymlinks?: boolean;
  /** memfs extension, absent from Node: deepest directory level to descend from `cwd`. */
  maxdepth?: number;
}

const depthOf = (path: string): number => (path === '.' ? 0 : path.split('/').length);

const EMPTY_OPTIONS: GlobOptions = {};

class Glob {
  protected readonly root: unknown;
  protected readonly withFileTypes: boolean;
  protected readonly followSymlinks: boolean = false;
  protected readonly maxdepth: number;
  protected readonly patterns: Pattern[];
  protected readonly exclude: ((entry: string | Dirent) => boolean) | undefined;
  protected readonly isExcluded: (value: string) => boolean = () => false;
  protected readonly cache: Cache;
  protected readonly results = new Set<string>();
  protected readonly queue: { path: string; patterns: Pattern[] }[] = [];
  protected readonly subpatterns = new Map<string, Pattern[]>();

  constructor(
    protected readonly fs: GlobFs,
    pattern: unknown,
    options: GlobOptions = EMPTY_OPTIONS,
  ) {
    validateObject(options, 'options');
    const { exclude, cwd, followSymlinks, withFileTypes, maxdepth } = options;
    this.cache = new Cache(fs);
    this.root = toPathIfFileURL(cwd) ?? '.';
    if (followSymlinks != null) {
      validateBoolean(followSymlinks, 'options.followSymlinks');
      this.followSymlinks = followSymlinks;
    }
    this.withFileTypes = !!withFileTypes;
    this.maxdepth = maxdepth ?? Infinity;
    if (exclude != null) {
      validateStringArrayOrFunction(exclude, 'options.exclude');
      if (Array.isArray(exclude)) {
        if (typeof this.root !== 'string') throw internalAssertionError();
        this.isExcluded = createExcludeMatcher(exclude, this.root);
      } else this.exclude = exclude as (entry: string | Dirent) => boolean;
    }
    let patterns: string[];
    if (typeof pattern === 'object') {
      validateStringArray(pattern, 'patterns');
      patterns = pattern as string[];
    } else {
      validateString(pattern, 'patterns');
      patterns = [pattern as string];
    }
    const compiled: Pattern[] = [];
    for (let i = 0; i < patterns.length; i++) {
      const [set, globParts] = compile(patterns[i]);
      for (let j = 0; j < set.length; j++) compiled.push(new Pattern(set[j], globParts[j], new Set([0]), new Set()));
    }
    this.patterns = compiled;
  }

  public *walk(): Generator<string | Dirent> {
    const queue = this.queue;
    queue.push({ path: '.', patterns: this.patterns });
    while (queue.length > 0) {
      const item = queue.pop()!;
      for (let i = 0; i < item.patterns.length; i++) yield* this.walkPattern(item.path, item.patterns[i]);
      this.subpatterns.forEach((patterns, path) => queue.push({ path, patterns }));
      this.subpatterns.clear();
    }
  }

  protected result(path: string): string | Dirent {
    if (!this.withFileTypes) return path;
    const full = isAbsolute(path) ? path : join(this.root as string, path);
    const stat = this.cache.statSync(full);
    return direntOf(basename(full), dirname(full), stat ? (stat as any).mode : 0);
  }

  protected isDirectory(path: string, stat: Dirent | null, pattern: Pattern): boolean {
    if (stat?.isDirectory()) return true;
    if (!stat?.isSymbolicLink()) return false;
    if (this.followSymlinks) return !!this.cache.followStatSync(path)?.isDirectory();
    return pattern.hasSeenSymlinks;
  }

  protected nextRealpaths(path: string, isDirectory: boolean, pattern: Pattern): Set<string> {
    if (!this.followSymlinks || !isDirectory) return pattern.realpaths;
    const real = this.cache.realpathSync(path);
    if (real === null) return pattern.realpaths;
    const realpaths = new Set(pattern.realpaths);
    realpaths.add(real);
    return realpaths;
  }

  protected isCyclic(path: string, isDirectory: boolean, pattern: Pattern): boolean {
    if (!this.followSymlinks || !isDirectory) return false;
    const real = this.cache.realpathSync(path);
    return real !== null && pattern.realpaths.has(real);
  }

  protected addSubpattern(path: string, pattern: Pattern): void {
    if (this.isExcluded(path)) return;
    const fullpath = resolve(this.root as string, path);
    if (this.isExcluded(fullpath + '/') && this.cache.statSync(fullpath)?.isDirectory()) return;
    const exclude = this.exclude;
    if (exclude) {
      if (this.withFileTypes) {
        const stat = this.cache.statSync(path);
        if (stat !== null && exclude(stat)) return;
      } else if (exclude(path)) return;
    }
    const existing = this.subpatterns.get(path);
    if (existing) existing.push(pattern);
    else this.subpatterns.set(path, [pattern]);
  }

  protected accept(path: string): boolean {
    if (this.results.has(path)) return false;
    if (this.isExcluded(resolve(this.root as string, path))) return false;
    this.results.add(path);
    return true;
  }

  protected *walkPattern(path: string, pattern: Pattern): Generator<string | Dirent> {
    if (this.cache.add(path, pattern)) return;
    const cache = this.cache;
    const fullpath = resolve(this.root as string, path);
    const stat = cache.statSync(fullpath);
    const last = pattern.last;
    const isDirectory = this.isDirectory(fullpath, stat, pattern);
    const isLast = pattern.isLast(isDirectory);
    const isFirst = pattern.isFirst();
    if (this.isExcluded(fullpath)) return;
    if (isFirst && pattern.at(0) === '') {
      this.addSubpattern('/', pattern.child(new Set([1])));
      return;
    }
    if (isFirst && pattern.at(0) === '..') {
      this.addSubpattern('../', pattern.child(new Set([1])));
      return;
    }
    if (isFirst && pattern.at(0) === '.') {
      this.addSubpattern('.', pattern.child(new Set([1])));
      return;
    }
    if (isLast && typeof pattern.at(-1) === 'string') {
      const p = pattern.at(-1) as string;
      const leaf = cache.statSync(join(fullpath, p));
      const match = join(path, p);
      if (leaf && (p || isDirectory) && this.accept(match)) yield this.result(match);
      if (pattern.indexes.size === 1 && pattern.indexes.has(last)) return;
    } else if (isLast && pattern.at(-1) === GLOBSTAR && (path !== '.' || pattern.at(0) === '.' || (!last && stat))) {
      // `**` reports the directory it starts from; "." only for `**` alone or a pattern that starts with "."
      if (this.accept(path)) yield this.result(path);
    }
    if (!isDirectory || this.isCyclic(fullpath, isDirectory, pattern)) return;
    if (depthOf(path) > this.maxdepth) return;
    const nextRealpaths = this.nextRealpaths(fullpath, isDirectory, pattern);
    let children: Dirent[];
    const firstPattern = pattern.indexes.size === 1 && pattern.at(pattern.indexes.values().next().value!);
    if (typeof firstPattern === 'string') {
      const child = cache.statSync(join(fullpath, firstPattern));
      if (!child) return;
      child.name = firstPattern;
      children = [child];
    } else children = cache.readdirSync(fullpath);
    for (let i = 0; i < children.length; i++) {
      const entry = children[i];
      const name = entry.name as string;
      const entryPath = join(path, name);
      const entryFullpath = join(fullpath, name);
      cache.addToStatCache(entryFullpath, entry);
      const entryIsDirectory =
        entry.isDirectory() ||
        (this.followSymlinks && entry.isSymbolicLink() && !!cache.followStatSync(entryFullpath)?.isDirectory());
      const subPatterns = new Set<number>();
      const nSymlinks = new Set<number>();
      for (const index of pattern.indexes) {
        if (cache.seen(entryPath, pattern, index) || cache.seen(entryPath, pattern, index + 1)) return;
        const current = pattern.at(index);
        const nextIndex = index + 1;
        const next = pattern.at(nextIndex);
        const fromSymlink = !this.followSymlinks && pattern.symlinks.has(index);
        if (current === GLOBSTAR) {
          const isDot = name.charCodeAt(0) === 46;
          const nextMatches = pattern.test(nextIndex, name);
          let nextNonGlobIndex = nextIndex;
          while (pattern.at(nextNonGlobIndex) === GLOBSTAR) nextNonGlobIndex++;
          const matchesDot = isDot && pattern.test(nextNonGlobIndex, name);
          if ((isDot && !matchesDot) || (this.exclude && this.exclude(this.withFileTypes ? entry : name))) continue;
          if (!fromSymlink && entryIsDirectory) subPatterns.add(index);
          else if (!fromSymlink && index === last && this.accept(entryPath)) yield this.result(entryPath);
          if (nextMatches && nextIndex === last && !isLast) {
            if (this.accept(entryPath)) yield this.result(entryPath);
          } else if (nextMatches && entryIsDirectory) subPatterns.add(index + 2);
          if ((nextMatches || pattern.at(0) === '.') && (entryIsDirectory || entry.isSymbolicLink()) && !fromSymlink)
            subPatterns.add(nextIndex);
          if (!this.followSymlinks && entry.isSymbolicLink()) nSymlinks.add(index);
          if (next === '..' && entryIsDirectory) {
            // `**/..` reaches both this directory and its parent
            const parent = join(path, '..');
            if (nextIndex < last) {
              if (!this.subpatterns.has(path) && !cache.seen(path, pattern, nextIndex + 1))
                this.subpatterns.set(path, [pattern.child(new Set([nextIndex + 1]))]);
              if (!this.subpatterns.has(parent) && !cache.seen(parent, pattern, nextIndex + 1))
                this.subpatterns.set(parent, [pattern.child(new Set([nextIndex + 1]))]);
            } else {
              if (!cache.seen(path, pattern, nextIndex)) {
                cache.add(path, pattern.child(new Set([nextIndex])));
                if (this.accept(path)) yield this.result(path);
              }
              if (!cache.seen(path, pattern, nextIndex) || !cache.seen(parent, pattern, nextIndex)) {
                cache.add(parent, pattern.child(new Set([nextIndex])));
                if (this.accept(parent)) yield this.result(parent);
              }
            }
          }
        }
        if (typeof current === 'string') {
          if (pattern.test(index, name) && index !== last) subPatterns.add(nextIndex);
          else if (current === '.' && pattern.test(nextIndex, name)) {
            if (nextIndex === last) {
              if (this.accept(entryPath)) yield this.result(entryPath);
            } else subPatterns.add(nextIndex + 1);
          }
        }
        if (typeof current === 'object' && pattern.test(index, name)) {
          if (index === last) {
            if (this.accept(entryPath)) yield this.result(entryPath);
          } else if (entryIsDirectory) subPatterns.add(nextIndex);
        }
      }
      if (subPatterns.size > 0) this.addSubpattern(entryPath, pattern.child(subPatterns, nSymlinks, nextRealpaths));
    }
  }
}

export const globWalk = (fs: GlobFs, pattern: unknown, options?: GlobOptions): Generator<string | Dirent> =>
  new Glob(fs, pattern, options).walk();

export const globSync = (fs: GlobFs, pattern: unknown, options?: GlobOptions): string[] => {
  const results: (string | Dirent)[] = [];
  for (const match of globWalk(fs, pattern, options)) results.push(match);
  return results as string[];
};

export async function* glob(fs: GlobFs, pattern: unknown, options?: GlobOptions): AsyncGenerator<string | Dirent> {
  yield* globWalk(fs, pattern, options);
}
