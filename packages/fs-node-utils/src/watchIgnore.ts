import { toRegex } from 'glob-to-regex.js';
import type { TWatchIgnorePattern } from './types/options';

/** Converts a single `watch()` `ignore` pattern into a filename predicate. */
export const watchIgnorePatternToMatcher = (pattern: TWatchIgnorePattern): ((filename: string) => boolean) => {
  if (typeof pattern === 'function') return pattern;
  if (pattern instanceof RegExp) return filename => pattern.test(filename);
  if (typeof pattern === 'string') {
    const regex = toRegex(pattern);
    return filename => regex.test(filename);
  }
  throw new TypeError(
    'The "options.ignore" property must be of type string, RegExp, function, or an array thereof. ' +
      `Received ${typeof pattern}`,
  );
};

/** Converts the `watch()` `ignore` option (pattern or array of patterns) into a filename predicate. */
export const watchIgnoreToMatcher = (
  ignore: TWatchIgnorePattern | TWatchIgnorePattern[],
): ((filename: string) => boolean) => {
  if (Array.isArray(ignore)) {
    const matchers = ignore.map(watchIgnorePatternToMatcher);
    return filename => matchers.some(matcher => matcher(filename));
  }
  return watchIgnorePatternToMatcher(ignore);
};
