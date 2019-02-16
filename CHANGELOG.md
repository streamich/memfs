## [2.15.2](https://github.com/streamich/memfs/compare/v2.15.1...v2.15.2) (2019-02-16)


### Bug Fixes

* 🐛 BigInt type handling ([c640f25](https://github.com/streamich/memfs/commit/c640f25))

## [2.15.1](https://github.com/streamich/memfs/compare/v2.15.0...v2.15.1) (2019-02-09)


### Bug Fixes

* 🐛 show directory path when throwing EISDIR in mkdir ([9dc7007](https://github.com/streamich/memfs/commit/9dc7007))
* 🐛 throw when creating root directory ([f77fa8b](https://github.com/streamich/memfs/commit/f77fa8b)), closes [#325](https://github.com/streamich/memfs/issues/325)

# [2.15.0](https://github.com/streamich/memfs/compare/v2.14.2...v2.15.0) (2019-01-27)


### Features

* **volume:** add env variable to suppress fs.promise api warnings ([e6b6d0a](https://github.com/streamich/memfs/commit/e6b6d0a))

## [2.14.2](https://github.com/streamich/memfs/compare/v2.14.1...v2.14.2) (2018-12-11)


### Bug Fixes

* fds to start from 0x7fffffff instead of 0xffffffff ([#277](https://github.com/streamich/memfs/issues/277)) ([31e44ba](https://github.com/streamich/memfs/commit/31e44ba))

## [2.14.1](https://github.com/streamich/memfs/compare/v2.14.0...v2.14.1) (2018-11-29)


### Bug Fixes

* don't copy legacy files into dist ([ab8ffbb](https://github.com/streamich/memfs/commit/ab8ffbb)), closes [#263](https://github.com/streamich/memfs/issues/263)

# [2.14.0](https://github.com/streamich/memfs/compare/v2.13.1...v2.14.0) (2018-11-12)


### Features

* add bigint option support ([00a017e](https://github.com/streamich/memfs/commit/00a017e))

## [2.13.1](https://github.com/streamich/memfs/compare/v2.13.0...v2.13.1) (2018-11-11)


### Bug Fixes

* 🐛 don't install semantic-release, incompat with old Node ([cd2b69c](https://github.com/streamich/memfs/commit/cd2b69c))
