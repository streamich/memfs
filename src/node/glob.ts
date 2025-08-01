import * as pathModule from 'path';
import { PathLike } from './types/misc';
import { IGlobOptions } from './types/options';
import { pathToFilename } from './util';
import Dirent from './Dirent';

const { sep, join, relative, resolve } = pathModule.posix;

/**
 * Convert a glob pattern to a regular expression
 * Supports: *, ?, **, [abc], [!abc], [a-z]
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i];

    switch (char) {
      case '*':
        if (pattern[i + 1] === '*') {
          // Handle **
          if (pattern[i + 2] === '/' || i + 2 === pattern.length) {
            regexStr += '(?:.*\\/)?'; // Match zero or more directories
            i += pattern[i + 2] === '/' ? 3 : 2;
          } else {
            regexStr += '[^/]*'; // Single *
            i++;
          }
        } else {
          regexStr += '[^/]*'; // Single *
          i++;
        }
        break;
      case '?':
        regexStr += '[^/]';
        i++;
        break;
      case '[':
        regexStr += '[';
        i++;
        if (i < pattern.length && pattern[i] === '!') {
          regexStr += '^';
          i++;
        }
        while (i < pattern.length && pattern[i] !== ']') {
          if (pattern[i] === '\\') {
            regexStr += '\\\\';
            i++;
          }
          regexStr += pattern[i];
          i++;
        }
        regexStr += ']';
        i++;
        break;
      case '.':
      case '^':
      case '$':
      case '+':
      case '{':
      case '}':
      case '(':
      case ')':
      case '|':
      case '\\':
        regexStr += '\\' + char;
        i++;
        break;
      default:
        regexStr += char;
        i++;
        break;
    }
  }

  return new RegExp('^' + regexStr + '$');
}

/**
 * Check if a path matches a glob pattern
 */
function matchesPattern(path: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(path);
}

/**
 * Check if a path should be excluded based on exclude patterns
 */
function isExcluded(path: string, exclude: string | string[] | ((path: string) => boolean) | undefined): boolean {
  if (!exclude) return false;

  if (typeof exclude === 'function') {
    return exclude(path);
  }

  const patterns = Array.isArray(exclude) ? exclude : [exclude];
  return patterns.some(pattern => matchesPattern(path, pattern));
}

/**
 * Walk directory tree and collect matching paths
 */
function walkDirectory(fs: any, dir: string, patterns: string[], options: IGlobOptions, currentDepth = 0): string[] {
  const results: string[] = [];
  const maxDepth = options.maxdepth ?? Infinity;
  const baseCwd = options.cwd ? pathToFilename(options.cwd as any) : process.cwd();

  if (currentDepth > maxDepth) {
    return results;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }) as Dirent[];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name.toString());
      const relativePath = relative(baseCwd, fullPath);

      // Skip if excluded
      if (isExcluded(relativePath, options.exclude)) {
        continue;
      }

      // Check if this path matches any pattern
      const matches = patterns.some(pattern => matchesPattern(relativePath, pattern));
      if (matches) {
        results.push(relativePath);
      }

      // Recurse into directories
      if (entry.isDirectory() && currentDepth < maxDepth) {
        const subResults = walkDirectory(fs, fullPath, patterns, options, currentDepth + 1);
        results.push(...subResults);
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }

  return results;
}

/**
 * Main glob implementation
 */
export function globSync(fs: any, pattern: string, options: IGlobOptions = {}): string[] {
  const cwd = options.cwd ? pathToFilename(options.cwd as any) : process.cwd();
  const resolvedCwd = resolve(cwd);

  const globOptions: IGlobOptions = {
    cwd: resolvedCwd,
    exclude: options.exclude,
    maxdepth: options.maxdepth,
    withFileTypes: options.withFileTypes || false,
  };

  let results: string[] = [];

  // Handle absolute patterns
  if (pathModule.posix.isAbsolute(pattern)) {
    const dir = pathModule.posix.dirname(pattern);
    const basename = pathModule.posix.basename(pattern);
    const dirResults = walkDirectory(fs, dir, [basename], { ...globOptions, cwd: dir });
    results.push(...dirResults.map(r => pathModule.posix.resolve(dir, r)));
  } else {
    // Handle relative patterns
    const dirResults = walkDirectory(fs, resolvedCwd, [pattern], globOptions);
    results.push(...dirResults);
  }

  // Remove duplicates and sort
  results = [...new Set(results)].sort();

  return results;
}
