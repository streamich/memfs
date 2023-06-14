const nodeMajorVersion = +process.version.split('.')[0].slice(1);

/**
 * The `File` global is available only starting in Node v20. Hence we run the
 * tests only in those versions.
 */
export const maybe = nodeMajorVersion >= 20 ? describe : describe.skip;
