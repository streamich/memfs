# Dependencies

This package depends on the following Node modules: `buffer`, `events`,
`streams`, `path`.

It also uses `process` and `setImmediate` globals, but mocks them, if not
available.

It uses `Promise` when available and throws when `promises` property is
accessed in an environment that does not support this ES2015 feature.

It uses `BigInt` when available and throws when `bigint` option is used
in an environment that does not support this ESNext feature.
