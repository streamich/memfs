/**
 * Creates a data URI from a string of data.
 *
 * @param data The data to convert to a data URI.
 * @param mime The MIME type of the data.
 * @returns The data URI.
 */
export const dataUri = (data: string, mime: string): string =>
  `data:${mime};utf8,${encodeURIComponent(data)}`;
