# [4.1.0](https://github.com/streamich/memfs/compare/v4.0.0...v4.1.0) (2023-06-20)


### Bug Fixes

* 🐛 allow readin into various kinds of buffers ([e9c70e9](https://github.com/streamich/memfs/commit/e9c70e97dc2e063848baf7e3d307cd30491116a2))
* 🐛 allow to seek in file ([b363689](https://github.com/streamich/memfs/commit/b3636899c8091a8ee1443b148fc23ebb1895ce18))
* 🐛 do not allow empty children names ([43da1d6](https://github.com/streamich/memfs/commit/43da1d6279e4c32543ebfd0780bf149d27a07265))
* 🐛 handle root folder better ([76de780](https://github.com/streamich/memfs/commit/76de78002fa4ae613308227fd03ee2f643c41671))
* 🐛 throw "ENOENT" and "ENOTDIR" when folder or file 404 ([ddd5d56](https://github.com/streamich/memfs/commit/ddd5d565b33009959e32e77db8e1705809c4c29a))


### Features

* 🎸 add .truncate() method ([085335c](https://github.com/streamich/memfs/commit/085335ca8736b67db05c02bbd11cccf5b9bf000b))
* 🎸 add ability to close files ([d3828a8](https://github.com/streamich/memfs/commit/d3828a8058808ebdcd055493f4c2f72e3bcb58e7))
* 🎸 add ability to create sub directories ([528c807](https://github.com/streamich/memfs/commit/528c807281a0f920d4c819eebef942cd250b4479))
* 🎸 add ability to remove all files ([566e29b](https://github.com/streamich/memfs/commit/566e29b543825e6bc71c9b881ce05e93ee657eca))
* 🎸 add appendFileSync() method ([27411e4](https://github.com/streamich/memfs/commit/27411e40125d8fb86e13977735d9122166d55961))
* 🎸 add basenem() utility ([43354e5](https://github.com/streamich/memfs/commit/43354e5a024c8be28a897c53e1d4ea5b46b66d39))
* 🎸 add copyFile() method ([5e207c4](https://github.com/streamich/memfs/commit/5e207c4a60019f4df187510682d83a0597df2468))
* 🎸 add copyFileSync() method ([5fc1bac](https://github.com/streamich/memfs/commit/5fc1bacf4a337ca25d0207a0e9f94768c2976528))
* 🎸 add createSwapFile() method ([b07ce79](https://github.com/streamich/memfs/commit/b07ce795e757cab67ab4b81e50c397486e32ba40))
* 🎸 add existsSync() method ([073ec6b](https://github.com/streamich/memfs/commit/073ec6be1ea86296105a7996e1f1da9160e5bbf3))
* 🎸 add fstatSync() method ([6b1597a](https://github.com/streamich/memfs/commit/6b1597a74d7dfd48682c92c6f4c660878160bba8))
* 🎸 add initial writign implementation ([6a50382](https://github.com/streamich/memfs/commit/6a503821e8a7a7031bddf0bed692fd37abdadecf))
* 🎸 add lstat() and fstat() methods ([e147d58](https://github.com/streamich/memfs/commit/e147d5850870cddf1c64bca747e6708676317817))
* 🎸 add mkdirSync() method ([bcad970](https://github.com/streamich/memfs/commit/bcad970b0b9cf704abf2e7ffd55d72078a54a79d))
* 🎸 add mkdtempSync() method ([68033dd](https://github.com/streamich/memfs/commit/68033dd4ea2aa321511aaca4c939f3c9168cfab8))
* 🎸 add options to promises.rmdir() method ([0628d56](https://github.com/streamich/memfs/commit/0628d56cc9b708ae468d9d3795a3175e1017cd13))
* 🎸 add pathToLocation() utility ([cb92a99](https://github.com/streamich/memfs/commit/cb92a9953d67aa32a8d6c6d40b1aa34be7b45c92))
* 🎸 add read/write mode separation ([60a65c1](https://github.com/streamich/memfs/commit/60a65c1d835dd49a18ef8dfafa75cedb62f05f5a))
* 🎸 add readdirSync() method ([3689abd](https://github.com/streamich/memfs/commit/3689abdecfeb226c0ef822b83d689cb12610adc0))
* 🎸 add readlinkSync() method ([8d243a0](https://github.com/streamich/memfs/commit/8d243a08ab6bbc72b83fac3a272c9f90a9817d33))
* 🎸 add readSync() method ([3729cd0](https://github.com/streamich/memfs/commit/3729cd0ad53f73a03b7a2d224688c5a3d6602f5a))
* 🎸 add realpathSync() method ([75890e0](https://github.com/streamich/memfs/commit/75890e0c44ce9673a58e85aba2f52dfdb02b9a5e))
* 🎸 add renameSync() method ([5b1cd63](https://github.com/streamich/memfs/commit/5b1cd63fd6bab83cefda64319bd77dc4ffb87c67))
* 🎸 add rm() method ([29a7dc8](https://github.com/streamich/memfs/commit/29a7dc84feb5676abb470bab626268dd4f71a955))
* 🎸 add rmdirSync() method ([695b62a](https://github.com/streamich/memfs/commit/695b62aa7e44fce5b420f1bc5c01c890d03c02d7))
* 🎸 add rmSync() method ([aa9acb3](https://github.com/streamich/memfs/commit/aa9acb342afd9b81e9abac18aa434631353e73f9))
* 🎸 add some common objects ([c89744d](https://github.com/streamich/memfs/commit/c89744de5284af50f16fa11496a0cf7c168766c7))
* 🎸 add sync api ([16d6600](https://github.com/streamich/memfs/commit/16d6600258bc01be052b9cfddc5e20373852d5ef))
* 🎸 add timeout to spin lock ([48e8e74](https://github.com/streamich/memfs/commit/48e8e741fb7a67978a065afb63397bba6d461726))
* 🎸 add truncateSync() and ftruncateSync() methods ([2b77619](https://github.com/streamich/memfs/commit/2b77619f48f61521679c0fb9bd08068842969206))
* 🎸 add typed array view support to volume ([7c8439f](https://github.com/streamich/memfs/commit/7c8439f5f92cc0441b5420bdfdf7feedabb6fe4c))
* 🎸 add unlinkSync() method ([417f911](https://github.com/streamich/memfs/commit/417f911334e195fe83e1171faf910ee0f28dea13))
* 🎸 add writev() method ([8190bfd](https://github.com/streamich/memfs/commit/8190bfd07bb21a27c5515151a4c19036473a08c4))
* 🎸 create FSA types folder ([bb0c75a](https://github.com/streamich/memfs/commit/bb0c75a48688d737054590d22a3b681a09b4f517))
* 🎸 create Node fs api tyeps ([4db1321](https://github.com/streamich/memfs/commit/4db13219aec4d6896d55012b83d7ea3f874f2dc1))
* 🎸 explose FSA from index file ([77696f5](https://github.com/streamich/memfs/commit/77696f5186ed419c161d529ffe3430371c8ce2ed))
* 🎸 implement .getDirectoryHandle() method ([090980c](https://github.com/streamich/memfs/commit/090980c1a1908fdab744582eae895b94a9887a52))
* 🎸 implement .getFile() method ([17015a3](https://github.com/streamich/memfs/commit/17015a31559096e83100f01523a5d9cf005b0ddb))
* 🎸 implement .getFileHandle() method ([40bdc13](https://github.com/streamich/memfs/commit/40bdc13802545dbdd3384a1f14c85bd40ca1ba50))
* 🎸 implement .isSameEntry() method ([438806b](https://github.com/streamich/memfs/commit/438806b0f9b5c52d53ccd5c9bdf38fbd78185a56))
* 🎸 implement .mkdir method ([be1525a](https://github.com/streamich/memfs/commit/be1525acff338c1cd12318bbcd936a20c5f1be63))
* 🎸 implement .mkdtemp() method ([2db4cd0](https://github.com/streamich/memfs/commit/2db4cd0420fbe6ced4bf4067010d5e9df386f38b))
* 🎸 implement .removeEntry() method ([dca57a2](https://github.com/streamich/memfs/commit/dca57a2f60e5ef3784df055a1811cb6b252ceb15))
* 🎸 implement .resolve() method ([9d5669c](https://github.com/streamich/memfs/commit/9d5669cc30b295c2e5e9b7373a8409cf0dd34bd3))
* 🎸 implement .values() and .entries() ([177010a](https://github.com/streamich/memfs/commit/177010a266582cb1552faafcee51a99f737e9d86))
* 🎸 implement .write() for FSA ([6a2fa2d](https://github.com/streamich/memfs/commit/6a2fa2d58c70ce2e410d60336d9f04a74e9f3dec))
* 🎸 implement access() method ([c72390b](https://github.com/streamich/memfs/commit/c72390b66b3bb9bf0585896f8d41cd89d8cc4be2))
* 🎸 implement accessSync() method ([719a19f](https://github.com/streamich/memfs/commit/719a19f2cd0c177bb076e58d02e59f888d433e31))
* 🎸 implement basic readdir ([685bc7e](https://github.com/streamich/memfs/commit/685bc7e90d6a490fdc017e3f3d03325384f76b1a))
* 🎸 implement basic rename() method, only for files ([4769314](https://github.com/streamich/memfs/commit/476931487f4105982f4825f808bbc8d9cd4c2df7))
* 🎸 implement basic state() method ([4039d64](https://github.com/streamich/memfs/commit/4039d64822a9c7d2c1137f045433f498e6503761))
* 🎸 implement closeSync() method ([646efaf](https://github.com/streamich/memfs/commit/646efafe2355794509d67ef13e59e5afcbbae8ae))
* 🎸 implement Dirent listings ([5d6f976](https://github.com/streamich/memfs/commit/5d6f97687b5f6bb297ad852f9e0ee7d6cf3e09f0))
* 🎸 implement exists() method ([0753937](https://github.com/streamich/memfs/commit/07539377eeb168140cc80087d23279fde92d18fc))
* 🎸 implement first version of readFile() method ([629f22a](https://github.com/streamich/memfs/commit/629f22a28eda1da04f28659994015094aa7fca39))
* 🎸 implement first version of worker ([caf8394](https://github.com/streamich/memfs/commit/caf8394ab23b9df40b92c157b791b2658958f1a9))
* 🎸 implement FSA ReadStream ([53784d9](https://github.com/streamich/memfs/commit/53784d9a873fad94bdd62c81be0a1fa3ef494618))
* 🎸 implement initial version of .open() mehtod ([cb363b5](https://github.com/streamich/memfs/commit/cb363b51451e157d95fcf0373293a9e9e4ca2504))
* 🎸 implement initial version of appendFile() method ([65580aa](https://github.com/streamich/memfs/commit/65580aa0ecc050cc9a9412afc913679d029591ae))
* 🎸 implement initial version of writeFile() method ([e2b2bfd](https://github.com/streamich/memfs/commit/e2b2bfdfc6aafba9e08d94a3a05886f0d9bc033a))
* 🎸 implement keys() method ([b8e8a4c](https://github.com/streamich/memfs/commit/b8e8a4c3d0e76c4f07450599f68061c5cc0a35a6))
* 🎸 implement openSync() method ([4b7eddd](https://github.com/streamich/memfs/commit/4b7edddf7ae430d5e4dad146b3cae74dcda73420))
* 🎸 implement read() method ([7357c14](https://github.com/streamich/memfs/commit/7357c14289c53d5c8dc13f38c1c696f01245b9a0))
* 🎸 implement readFileSync() method ([953d276](https://github.com/streamich/memfs/commit/953d27640da965cc76b85b41db75fbb36c35c093))
* 🎸 implement readFileSync() method ([bb803e2](https://github.com/streamich/memfs/commit/bb803e267a6e0c0442a08fcdfdae75f3e7806ad8))
* 🎸 implement realpath() method ([99b12dc](https://github.com/streamich/memfs/commit/99b12dcf752aeca16e7990ead1fdc63b6b29e004))
* 🎸 implement rmdir() method ([973af0a](https://github.com/streamich/memfs/commit/973af0a0786db30b3e73bd113fab516ccf6fa3ed))
* 🎸 implement sync messenger ([d221870](https://github.com/streamich/memfs/commit/d221870f475d49e251a8cb9bdd41b9b31d2036f4))
* 🎸 implement sync write method ([22047da](https://github.com/streamich/memfs/commit/22047dad02f7c6558f3aea1d296b0574c92e8095))
* 🎸 implement truncation ([d4469d1](https://github.com/streamich/memfs/commit/d4469d1650754f44107e13e447a9b95d581573e5))
* 🎸 implement unlink() method ([6bd3e75](https://github.com/streamich/memfs/commit/6bd3e75fa379bfc3abbb1ff14d6975a87ece9f34))
* 🎸 implement writeSync() method ([12a8b3f](https://github.com/streamich/memfs/commit/12a8b3f442183460ea9b76cf5443bcaff4e63680))
* 🎸 improve mkdir method ([c393f6c](https://github.com/streamich/memfs/commit/c393f6c47ae55f93d4b363b0d1a43115ebd61b6a))
* 🎸 improve read stream interfaces ([6d5de0c](https://github.com/streamich/memfs/commit/6d5de0c6f2edfc44e7f25af4c836aed8bf72f5e2))
* 🎸 improve stat method ([c6eeab4](https://github.com/streamich/memfs/commit/c6eeab42fdfe700863ed35e7e6f5c19a86c75c79))
* 🎸 improve write stream, better flag handling ([7b9e0a3](https://github.com/streamich/memfs/commit/7b9e0a319ee14b13988655e7a0d52bc788119e33))
* 🎸 improve writing at offset logic ([392932a](https://github.com/streamich/memfs/commit/392932a6e95224abb30dca8ee54790448411a39b))
* 🎸 improve writing to file ([3edcac1](https://github.com/streamich/memfs/commit/3edcac1c992c3bd7edaca793024c50934dbc028d))
* 🎸 include "writeSync" method for sync writer ([b006b2d](https://github.com/streamich/memfs/commit/b006b2d9ca040a674e02d80defd884ce54f5e725))
* 🎸 introduce FSA context ([b696e09](https://github.com/streamich/memfs/commit/b696e09c426494ae54ace33d738523da9410ef13))
* 🎸 make basic WriteStream work ([c109af1](https://github.com/streamich/memfs/commit/c109af189e1410789af62861c91dc032248fc31f))
* 🎸 make statSync() resolve the path correctly ([7801533](https://github.com/streamich/memfs/commit/78015333c698c105313aaa02f2ecfbeaae6ba339))
* 🎸 normalize adapter rpc ([96b8374](https://github.com/streamich/memfs/commit/96b8374542ecc07294afe94bb18c77d4e7cb0fec))
* 🎸 progress on writable stream ([9900423](https://github.com/streamich/memfs/commit/9900423ff6a91449bc0bf51c265013b390df378d))
* 🎸 setup fsa to node utility ([5fa0d61](https://github.com/streamich/memfs/commit/5fa0d61dfedc7234315030e84276763546ee7733))
* 🎸 setup node-to-fsa folder ([16e78e3](https://github.com/streamich/memfs/commit/16e78e35807a12d601d4a6cb8b22e882918a871a))
* 🎸 setup webfs ([99c915f](https://github.com/streamich/memfs/commit/99c915f632d0f22533a828069c082dec6d378e3c))
* 🎸 standartize message contents ([c254dc7](https://github.com/streamich/memfs/commit/c254dc7e75756c81761c7125698a1ded0c1f40b0))
* 🎸 start synchronous file handle implementation ([d05c407](https://github.com/streamich/memfs/commit/d05c4074eac562b72fe0f04142c43e05fcc7d70c))
* 🎸 start WriteStream implementation ([32e13a8](https://github.com/streamich/memfs/commit/32e13a80863424ead759b64e0e35af20762ef849))
* 🎸 throw exception on closed files ([5119b8f](https://github.com/streamich/memfs/commit/5119b8f1bfd33ff7a289e522bb2fb3198391a5d7))
* 🎸 track number of written bytes ([7a65daa](https://github.com/streamich/memfs/commit/7a65daa7cb9c12750f7174192fffcf81d8ae8dc5))
* 🎸 write through a swap file ([5134766](https://github.com/streamich/memfs/commit/513476627892d2e5a3b32f11ad12303eb712cc34))

# [4.0.0](https://github.com/streamich/memfs/compare/v3.6.0...v4.0.0) (2023-06-16)


### Features

* 🎸 add File System Access API TypeScript types ([3ea8641](https://github.com/streamich/memfs/commit/3ea86417c4349cf5d0f9f4f9d91f57c9a9d67d42))


### BREAKING CHANGES

* 🧨 no breaking changes in this commit, but bumping to get this to v4 in NPM

# [3.6.0](https://github.com/streamich/memfs/compare/v3.5.3...v3.6.0) (2023-06-16)


### Features

* 🎸 node fs and volume improvements ([5bc245b](https://github.com/streamich/memfs/commit/5bc245b814c8a36c01deae1cc0fa167c294a02c0))

## [3.5.3](https://github.com/streamich/memfs/compare/v3.5.2...v3.5.3) (2023-06-07)


### Bug Fixes

* bump fs-monkey minimum version for rm support ([#909](https://github.com/streamich/memfs/issues/909)) ([595a473](https://github.com/streamich/memfs/commit/595a473a9c3d0634ace4e431f984b1a34a559855))

## [3.5.2](https://github.com/streamich/memfs/compare/v3.5.1...v3.5.2) (2023-06-02)


### Bug Fixes

* correctly output filename when watching files ([#907](https://github.com/streamich/memfs/issues/907)) ([fbde74f](https://github.com/streamich/memfs/commit/fbde74f2fd352ed1388029ffe8369f47a62eb05f))

## [3.5.1](https://github.com/streamich/memfs/compare/v3.5.0...v3.5.1) (2023-04-20)


### Bug Fixes

* ensure metadata is updated correctly so that `watchFile` is correctly triggered ([#891](https://github.com/streamich/memfs/issues/891)) ([8af880e](https://github.com/streamich/memfs/commit/8af880ed831493f38cedea827396a154a8fbce37))

# [3.5.0](https://github.com/streamich/memfs/compare/v3.4.13...v3.5.0) (2023-04-06)


### Features

* support the `recursive` option for `fs.watch()` ([#902](https://github.com/streamich/memfs/issues/902)) ([c829803](https://github.com/streamich/memfs/commit/c8298036d945d872d667fcd05a74d7f5c61654d0))

## [3.4.13](https://github.com/streamich/memfs/compare/v3.4.12...v3.4.13) (2023-01-07)


### Bug Fixes

* set `path` on errors when possible ([#893](https://github.com/streamich/memfs/issues/893)) ([fb6e1e6](https://github.com/streamich/memfs/commit/fb6e1e65ef26a9a363499ff473af1e37e309d157))

## [3.4.12](https://github.com/streamich/memfs/compare/v3.4.11...v3.4.12) (2022-11-19)


### Bug Fixes

* `mkdir` return value ([#882](https://github.com/streamich/memfs/issues/882)) ([125ad2e](https://github.com/streamich/memfs/commit/125ad2e2bf268963fb0b8f287965bb7e2a2b230d))

## [3.4.11](https://github.com/streamich/memfs/compare/v3.4.10...v3.4.11) (2022-11-13)


### Bug Fixes

* return `/` when calling `realpathSync` with `/` ([#867](https://github.com/streamich/memfs/issues/867)) ([8d8e8d1](https://github.com/streamich/memfs/commit/8d8e8d150b4aea30f173c12bc9ca36709b44bcf5)), closes [#863](https://github.com/streamich/memfs/issues/863)

## [3.4.10](https://github.com/streamich/memfs/compare/v3.4.9...v3.4.10) (2022-11-03)


### Bug Fixes

* support calling `chmod` on a directory ([#870](https://github.com/streamich/memfs/issues/870)) ([7c5999c](https://github.com/streamich/memfs/commit/7c5999c88e58527861557fdfddc4069aedba3eef)), closes [#558](https://github.com/streamich/memfs/issues/558)

## [3.4.9](https://github.com/streamich/memfs/compare/v3.4.8...v3.4.9) (2022-10-29)


### Bug Fixes

* support calling `utimes` on a directory ([#866](https://github.com/streamich/memfs/issues/866)) ([301f2d1](https://github.com/streamich/memfs/commit/301f2d19a2c9ae72d436b412e3c009112631c736)), closes [#391](https://github.com/streamich/memfs/issues/391)

## [3.4.8](https://github.com/streamich/memfs/compare/v3.4.7...v3.4.8) (2022-10-28)


### Bug Fixes

* extend with null bytes when calling `truncate` with a `len` greater than the current file size ([#875](https://github.com/streamich/memfs/issues/875)) ([25027fb](https://github.com/streamich/memfs/commit/25027fb79ed32334259b7164ea1d784676e1b1bf))

## [3.4.7](https://github.com/streamich/memfs/compare/v3.4.6...v3.4.7) (2022-06-24)


### Bug Fixes

* dont patch `getuid` and `getgid` on `process` anymore ([#847](https://github.com/streamich/memfs/issues/847)) ([1c19e87](https://github.com/streamich/memfs/commit/1c19e873641c68dcc2c0f406b8cd3a331e563a25))

## [3.4.6](https://github.com/streamich/memfs/compare/v3.4.5...v3.4.6) (2022-06-18)


### Bug Fixes

* loosen dependency constraints ([#855](https://github.com/streamich/memfs/issues/855)) ([af1c224](https://github.com/streamich/memfs/commit/af1c2242194b932859a63be61cc0a3dd6064fec9))

## [3.4.5](https://github.com/streamich/memfs/compare/v3.4.4...v3.4.5) (2022-06-18)


### Bug Fixes

* throw EEXIST when opening file that already exists with 'wx' flag ([#853](https://github.com/streamich/memfs/issues/853)) ([8b021b3](https://github.com/streamich/memfs/commit/8b021b3bb3205ceb3024fbd88ab01b63189f7575))

## [3.4.4](https://github.com/streamich/memfs/compare/v3.4.3...v3.4.4) (2022-05-28)


### Bug Fixes

* allow `Uint8Array`s to be passed to `FsWriteStream` ([#842](https://github.com/streamich/memfs/issues/842)) ([4398992](https://github.com/streamich/memfs/commit/43989925480f8326cdb602f23265c2191a9e1d1d))

## [3.4.3](https://github.com/streamich/memfs/compare/v3.4.2...v3.4.3) (2022-05-17)


### Bug Fixes

* ensure js file is copied to expected place ([#838](https://github.com/streamich/memfs/issues/838)) ([90e2e1d](https://github.com/streamich/memfs/commit/90e2e1d917ca2a053739c7d214d805a3bc9bcded))

## [3.4.2](https://github.com/streamich/memfs/compare/v3.4.1...v3.4.2) (2022-05-17)


### Bug Fixes

* set `closed` property correct on Node 18 ([#836](https://github.com/streamich/memfs/issues/836)) ([d1823e1](https://github.com/streamich/memfs/commit/d1823e1cf986cc0d3982311b13fbdfd4de16f8fd))

## [3.4.1](https://github.com/streamich/memfs/compare/v3.4.0...v3.4.1) (2021-12-30)


### Bug Fixes

* recursively sync children steps to fix rename ([43e8222](https://github.com/streamich/memfs/commit/43e82223046362c5e0176c112675c5636baac389))

# [3.4.0](https://github.com/streamich/memfs/compare/v3.3.0...v3.4.0) (2021-11-24)


### Features

* support the `throwIfNoEntry` option ([80cf803](https://github.com/streamich/memfs/commit/80cf80380757b1cb08c5ae6af828b8aff1b8cb93))

# [3.3.0](https://github.com/streamich/memfs/compare/v3.2.4...v3.3.0) (2021-09-19)


### Bug Fixes

* 🐛 remove unused method ([05b2a47](https://github.com/streamich/memfs/commit/05b2a472f75b46ce52a4730a8cd2d666a5deb196))


### Features

* 🎸 add .rmSync(), .rm(), and .promises.rm() methods ([2414fb6](https://github.com/streamich/memfs/commit/2414fb6dae207536bf46120c4e09d8d51366a6c1))
* 🎸 add support for "recursive" and "force" flags in .rm() ([7f6714c](https://github.com/streamich/memfs/commit/7f6714cf14b90ce9cf50eeae517663b843687f90))

## [3.2.4](https://github.com/streamich/memfs/compare/v3.2.3...v3.2.4) (2021-09-02)


### Bug Fixes

* 🐛 use globalThis defensively ([eed6bbf](https://github.com/streamich/memfs/commit/eed6bbfa2fc310639974ed9e163876ff8253b321))

## [3.2.3](https://github.com/streamich/memfs/compare/v3.2.2...v3.2.3) (2021-08-31)


### Bug Fixes

* global and timers this arg in browser ([1e93ab1](https://github.com/streamich/memfs/commit/1e93ab1628e230762471737a1d2586b5bc86b496))
* prevent callback from triggering twice when callback throws ([07e8215](https://github.com/streamich/memfs/commit/07e8215b4a862ae2e0f1cd7f7cfe4b1465bfc2e6))
* prevent callback from triggering twice when callback throws ([6db755d](https://github.com/streamich/memfs/commit/6db755dabc32d81eceeb3152413bb70298a5c710)), closes [#542](https://github.com/streamich/memfs/issues/542)

## [3.2.2](https://github.com/streamich/memfs/compare/v3.2.1...v3.2.2) (2021-04-05)


### Bug Fixes

* **deps:** update dependency fs-monkey to v1.0.2 ([07f05db](https://github.com/streamich/memfs/commit/07f05db8b0aed43360abaf172d4297f3873d44fe))
* **deps:** update dependency fs-monkey to v1.0.3 ([84346ed](https://github.com/streamich/memfs/commit/84346ed7d0556b2b79f57b9b10889e54afcaebd1))

## [3.2.1](https://github.com/streamich/memfs/compare/v3.2.0...v3.2.1) (2021-03-31)


### Bug Fixes

* add `The Unlicense` license SDPX in package.json ([#594](https://github.com/streamich/memfs/issues/594)) ([0e7b04b](https://github.com/streamich/memfs/commit/0e7b04b0d5172846340e95619edaa18579ed5d06))

# [3.2.0](https://github.com/streamich/memfs/compare/v3.1.3...v3.2.0) (2020-05-19)


### Bug Fixes

* 'fromJSON()' did not consider cwd when creating directories ([3d6ee3b](https://github.com/streamich/memfs/commit/3d6ee3b2c0eef0345ba2bd400e9836f2d685321f))


### Features

* support nested objects in 'fromJSON()' ([f8c329c](https://github.com/streamich/memfs/commit/f8c329c8e57c85cc4a394a74802af1f37dcedefd))

## [3.1.3](https://github.com/streamich/memfs/compare/v3.1.2...v3.1.3) (2020-05-14)


### Bug Fixes

* **deps:** update dependency fs-monkey to v1.0.1 ([10fc705](https://github.com/streamich/memfs/commit/10fc705c46d57a4354afb9372a98dcdfed9d551d))

## [3.1.2](https://github.com/streamich/memfs/compare/v3.1.1...v3.1.2) (2020-03-12)


### Bug Fixes

* should throw `EEXIST` instead of `EISDIR` on `mkdirSync('/')` ([f89eede](https://github.com/streamich/memfs/commit/f89eede9530c3f5bd8d8a523be1927d396cda662))

## [3.1.1](https://github.com/streamich/memfs/compare/v3.1.0...v3.1.1) (2020-02-17)


### Bug Fixes

* **deps:** update dependency fs-monkey to v1 ([ccd1be0](https://github.com/streamich/memfs/commit/ccd1be08c5b13dd620ed814def1a84b81614cab2))

# [3.1.0](https://github.com/streamich/memfs/compare/v3.0.6...v3.1.0) (2020-02-17)


### Features

* replace `fast-extend` with native `Object.assign` ([934f1f3](https://github.com/streamich/memfs/commit/934f1f31948e5b4afc9ea101f9c5ad20017df217))
* specify `engines` field with `node` constraint of `>= 8.3.0` ([7d3b132](https://github.com/streamich/memfs/commit/7d3b132c35639c10a5750e8e17b839b619f2ab41))

## [3.0.6](https://github.com/streamich/memfs/compare/v3.0.5...v3.0.6) (2020-02-16)


### Bug Fixes

* export `DirectoryJSON` from `index` ([c447a6c](https://github.com/streamich/memfs/commit/c447a6c8f8ee66b8a55d4cb2a2a2279ab5cf03d1))

## [3.0.5](https://github.com/streamich/memfs/compare/v3.0.4...v3.0.5) (2020-02-15)


### Bug Fixes

* remove space from error message ([42f870a](https://github.com/streamich/memfs/commit/42f870a31d902f37ccdad7915df8e7806cd3ce29))
* use `IStore` interface instead of `Storage` ([ff82480](https://github.com/streamich/memfs/commit/ff824809b84c98e0ee26b81e601e983bfb6c2e97))
* use `PathLike` type from node ([98a4014](https://github.com/streamich/memfs/commit/98a40143dbc0422541458e1f3243b3c4656e1e98))

## [3.0.4](https://github.com/streamich/memfs/compare/v3.0.3...v3.0.4) (2020-01-15)


### Bug Fixes

* 🐛 handle opening directories with O_DIRECTORY ([acdfac8](https://github.com/streamich/memfs/commit/acdfac872b657776d32f1bfd346726c422a199f0)), closes [#494](https://github.com/streamich/memfs/issues/494)

## [3.0.3](https://github.com/streamich/memfs/compare/v3.0.2...v3.0.3) (2019-12-25)


### Bug Fixes

* **rmdir:** proper async functionality ([cc75c56](https://github.com/streamich/memfs/commit/cc75c566b8d485720457315d267c0d8cab6283cf))
* **rmdir:** support recursive option ([1e943ae](https://github.com/streamich/memfs/commit/1e943ae5911b3490f6c78d92a16ee0920480265c))
* **watch:** suppress event-emitter warnings ([1ab2dcb](https://github.com/streamich/memfs/commit/1ab2dcb4706b7fe02868d94e335673b72d1ce0d7))

## [3.0.2](https://github.com/streamich/memfs/compare/v3.0.1...v3.0.2) (2019-12-25)


### Bug Fixes

* **watch:** trigger change event for creation/deletion of children in a folder ([b1b7884](https://github.com/streamich/memfs/commit/b1b7884d4b9af734773c178ab4377e55a5bb2cc6))

## [3.0.1](https://github.com/streamich/memfs/compare/v3.0.0...v3.0.1) (2019-11-26)


### Performance Improvements

* ⚡️ bump fast-extend ([606775b](https://github.com/streamich/memfs/commit/606775bb6f20bc16a53b911d2a095bf8a6385e1a))

# [3.0.0](https://github.com/streamich/memfs/compare/v2.17.1...v3.0.0) (2019-11-26)


### Bug Fixes

* 🐛 adjust definition of `TCallback` to accept `null` for `error` parameter ([aedcbda](https://github.com/streamich/memfs/commit/aedcbda69178406f098abffd731e6ff87e39bf1e))
* 🐛 adjust return of `Link#walk` to return `Link | null` ([1b76cb1](https://github.com/streamich/memfs/commit/1b76cb18d0eb2494c69a2ac58304437eb3a80aef))
* 🐛 adjust type of `children` in `Link` to be possibly undefined ([b4945c2](https://github.com/streamich/memfs/commit/b4945c2fe9ffb49949bf133d157602ef7c9799d6))
* 🐛 allow `_modeToNumber` to be called w/ `undefined` ([07c0b7a](https://github.com/streamich/memfs/commit/07c0b7a4e99d7cf7b4d6fa73611d13f49e973ce0))
* 🐛 allow `_modeToNumber` to return `undefined` ([3e3c992](https://github.com/streamich/memfs/commit/3e3c992c135df489b066c4ac5a5dc022a5ce515c))
* 🐛 allow `assertEncoding` to be called w/ `undefined` ([e37ab9a](https://github.com/streamich/memfs/commit/e37ab9ad940215d3eb62c533e43c590e81e76f73))
* 🐛 allow `Dirent~build` to accept `undefined` for the `encoding` parameter ([8ca3550](https://github.com/streamich/memfs/commit/8ca355033bc6845e3f89222e4239e6d42bff8cbf))
* 🐛 allow `flagsToNumber` to be called w/ `undefined` ([dbfc754](https://github.com/streamich/memfs/commit/dbfc7546d32dffec7b154ed4db8a0c839d68fbda))
* 🐛 allow `mkdtempBase` to be called w/ `undefined` for `encoding` ([f28c395](https://github.com/streamich/memfs/commit/f28c39524fd1c219cb649fee71fcb9077cc1c65a))
* 🐛 allow `modeToNumber` to be called w/ `undefined` ([336821d](https://github.com/streamich/memfs/commit/336821dea78da61739177de57fe10d4e5fcc71ff))
* 🐛 allow `realpathBase` to be called w/ `undefined` for `encoding` ([e855f1c](https://github.com/streamich/memfs/commit/e855f1c8a82bdbd77790c3734d89e54ce01fd3ff))
* 🐛 create `tryGetChild` util function ([b5093a1](https://github.com/streamich/memfs/commit/b5093a12d221e39bc796d5c06819106980845414))
* 🐛 create `tryGetChildNode` util function ([62b5a52](https://github.com/streamich/memfs/commit/62b5a52e93af91c7d3aefcaeb9955f100e2ee841))
* 🐛 define the type elements in the `Volume.releasedFds` array ([9e21f3a](https://github.com/streamich/memfs/commit/9e21f3a4d66b408611aba55e3856f92a3a86eec8))
* 🐛 don't assign `null` to `._link` property in `FSWatcher` ([71569c0](https://github.com/streamich/memfs/commit/71569c0cfece432fa90a2b86439c375a55aec507))
* 🐛 don't assign `null` to `._steps` property in `FSWatcher` ([0e94b9c](https://github.com/streamich/memfs/commit/0e94b9c83604fb040b9bb09a3fb3b4e5b6a234ed))
* 🐛 don't assign `null` to `.buf` property in `Node` ([00be0c2](https://github.com/streamich/memfs/commit/00be0c25766943e1aec0c5cfdfa97562a391d4a4))
* 🐛 don't assign `null` to `.link` property in `File` ([5d01713](https://github.com/streamich/memfs/commit/5d017135190fa1a5001fe348e003cbd7a87a504a))
* 🐛 don't assign `null` to `.node` property in `File` ([d06201e](https://github.com/streamich/memfs/commit/d06201e4def96703aa72af2c3eb3526ec26d1daf))
* 🐛 don't assign `null` to `.node` property in `Link` ([4d7f439](https://github.com/streamich/memfs/commit/4d7f439b476e8f2f92a755af288f108e3cdf9263))
* 🐛 don't assign `null` to `.parent` property in `Link` ([b3e60b6](https://github.com/streamich/memfs/commit/b3e60b6475b478f4b65a5a80ac014cf24024f9be))
* 🐛 don't assign `null` to `.symlink` property in `Node` ([9bfb6f5](https://github.com/streamich/memfs/commit/9bfb6f593f5c89426d834b5efe57bb33667f43f7))
* 🐛 don't assign `null` to `StatWatcher.prev` property ([fd1a253](https://github.com/streamich/memfs/commit/fd1a253029631cad6bbb1467ac56bab379f3b921))
* 🐛 don't assign `null` to `StatWatcher.vol` property ([1540522](https://github.com/streamich/memfs/commit/15405222841ee846210f1ae17351beef7c8dcc57))
* 🐛 don't set `#vol` or `#parent` of `link` to `null` ([b396f04](https://github.com/streamich/memfs/commit/b396f041f93709379feb3883321ccba21da8a569))
* 🐛 enable `strictNullChecks` ([3896de7](https://github.com/streamich/memfs/commit/3896de79a59fa5a8237e922304f5636e614e2d32))
* 🐛 make `StatWatcher.timeoutRef` property optional ([d09cd03](https://github.com/streamich/memfs/commit/d09cd035ceac44d3ebcb6ef12be7c4b5f1ccbca4))
* 🐛 refactor `#access` to be compatible w/ `strictNullChecks` ([82ed81b](https://github.com/streamich/memfs/commit/82ed81b32a0709296ef36dfed26032628bddcf5c))
* 🐛 refactor `#copyFileSync` to be compatible w/ `strictNullChecks` ([40f8337](https://github.com/streamich/memfs/commit/40f8337a21abe9ecc48576ad012c585f73df2e35))
* 🐛 refactor `#createLink` to be compatible w/ `strictNullChecks` ([7d8559d](https://github.com/streamich/memfs/commit/7d8559d022de1c0ba14d6081be585d549b69529b))
* 🐛 refactor `#ftruncate` to be compatible w/ `strictNullChecks` ([f2ea3f1](https://github.com/streamich/memfs/commit/f2ea3f1c7aa094243cc916c5f8fe716efc6c9b11))
* 🐛 refactor `#mkdir` to be compatible w/ `strictNullChecks` ([d5d7883](https://github.com/streamich/memfs/commit/d5d78839be0ed1c39bdee0c2b20627d94107f4ed))
* 🐛 refactor `#mkdirp` to be compatible w/ `strictNullChecks` ([6cf0bce](https://github.com/streamich/memfs/commit/6cf0bceb5a71743a5dd4ff15d37a8af77f6d9b5c))
* 🐛 refactor `#mkdtempBase` to be compatible w/ `strictNullChecks` ([d935b3b](https://github.com/streamich/memfs/commit/d935b3b3240c2328207ce01885bd4fcc8b5310db))
* 🐛 refactor `#mkdtempSync` to be compatible w/ `strictNullChecks` ([7e22617](https://github.com/streamich/memfs/commit/7e22617c55ac935edf5dc0dc093e3e8c393c7d2d))
* 🐛 refactor `#newFdNumber` to be compatible w/ `strictNullChecks` ([0bc4a15](https://github.com/streamich/memfs/commit/0bc4a1569af6ea5a98f4ee51a84ca770f302fc21))
* 🐛 refactor `#newInoNumber` to be compatible w/ `strictNullChecks` ([e9ba56c](https://github.com/streamich/memfs/commit/e9ba56c0a1a1cc9fbd443297dddf58559c782789))
* 🐛 refactor `#openFile` to be compatible w/ `strictNullChecks` ([1c4a4ba](https://github.com/streamich/memfs/commit/1c4a4ba78e99d3250b1e6f25952408e21b9cacfc))
* 🐛 refactor `#openLink` to be compatible w/ `strictNullChecks` ([216a85f](https://github.com/streamich/memfs/commit/216a85f4d279a9d1a300c745b365a79fa2da450e))
* 🐛 refactor `#read` to be compatible w/ `strictNullChecks` ([87b587f](https://github.com/streamich/memfs/commit/87b587fa6738d3ecfeca8f2ee41704665602131b))
* 🐛 refactor `#readdirBase` to be compatible w/ `strictNullChecks` ([ab248b4](https://github.com/streamich/memfs/commit/ab248b4071fab8e51c5d2b9c3f8e5828c86798cb))
* 🐛 refactor `#readFileBase` to be compatible w/ `strictNullChecks` ([27a4dad](https://github.com/streamich/memfs/commit/27a4dada340fa91f36449f2b2477accee79c12d1))
* 🐛 refactor `#readlinkBase` to be compatible w/ `strictNullChecks` ([b2e0f76](https://github.com/streamich/memfs/commit/b2e0f76415f2248bde783bed216f9adca994465a))
* 🐛 refactor `#resolveSymlinks` to be compatible w/ `strictNullChecks` ([6dc4913](https://github.com/streamich/memfs/commit/6dc49130d248510fa31c1480f04c7be412a71158))
* 🐛 refactor `#statBase` to be compatible w/ `strictNullChecks` ([ba0c20a](https://github.com/streamich/memfs/commit/ba0c20a098ac4f5e7be85b3503418074c681c3b0))
* 🐛 refactor `#symlink` to be compatible w/ `strictNullChecks` ([4148ad3](https://github.com/streamich/memfs/commit/4148ad399a01a8532986e359e726872d0e207885))
* 🐛 refactor `#truncate` to be compatible w/ `strictNullChecks` ([fadbd77](https://github.com/streamich/memfs/commit/fadbd771ca113758772dc50b999fb74d79db2e15))
* 🐛 refactor `#watch` to be compatible w/ `strictNullChecks` ([415a186](https://github.com/streamich/memfs/commit/415a186553bbf575d3447622a1a309b0665e0e14))
* 🐛 refactor `#watchFile` to be compatible w/ `strictNullChecks` ([2c02287](https://github.com/streamich/memfs/commit/2c02287f2cbdf16197ad1d67f7a9ca022bebf6af))
* 🐛 refactor `#write` to be compatible w/ `strictNullChecks` ([2ba6e0f](https://github.com/streamich/memfs/commit/2ba6e0f8883dabeb1f31684f4f6743cbd3eb3d39))
* 🐛 refactor `#writeFile` to be compatible w/ `strictNullChecks` ([ac78c50](https://github.com/streamich/memfs/commit/ac78c50d3108d3e706ad7c510af9f1125f9cd265))
* 🐛 refactor `#writeFileBase` to be compatible w/ `strictNullChecks` ([e931778](https://github.com/streamich/memfs/commit/e931778b9340f39560a45e47a1052826476f4941))
* 🐛 refactor `#writeSync` to be compatible w/ `strictNullChecks` ([7b67eea](https://github.com/streamich/memfs/commit/7b67eea4448a9b4e102f92ddf36d13ce03ea33b6))
* 🐛 refactor `copyFile` tests to be compatible w/ `strictNullChecks` ([e318af2](https://github.com/streamich/memfs/commit/e318af2e810c482f721299e924721981fc9b9979))
* 🐛 refactor `errors` to be compatible w/ `strictNullChecks` ([b25c035](https://github.com/streamich/memfs/commit/b25c03560eabfff1b55a6e360453cc6ba568b811))
* 🐛 refactor `exists` tests to be compatible w/ `strictNullChecks` ([81a564f](https://github.com/streamich/memfs/commit/81a564f17202a4db4564fd2171c785731285c64c))
* 🐛 refactor `renameSync` tests to use `tryGetChildNode` ([8cd782a](https://github.com/streamich/memfs/commit/8cd782ab1407e2888678b27831c4ec0f2f6f22ef))
* 🐛 refactor `volume` tests to be compatible w/ `strictNullChecks` ([f02fbac](https://github.com/streamich/memfs/commit/f02fbacaab0cec7d08f27ab5b58a7e3f39adba63))
* 🐛 refactor `volume` tests to use `tryGetChild` ([5a6624f](https://github.com/streamich/memfs/commit/5a6624f992626e8c790b8569557d1d9ae01f52ad))
* 🐛 refactor `volume` tests to use `tryGetChildNode` ([34acaac](https://github.com/streamich/memfs/commit/34acaacdc8567027a794c9896c86cd7b6a2b5c11))
* 🐛 refactor `writeFileSync` tests to be compatible w/ `strictNullChecks` ([4b7f164](https://github.com/streamich/memfs/commit/4b7f1643cc312f12fb2dcc7aa3b1b3fc08ff007f))
* 🐛 remove unused `getArgAndCb` function ([f8bb0f8](https://github.com/streamich/memfs/commit/f8bb0f852c560d55ee9af400da9a786e8a94b1ea))
* 🐛 replace `throwError` fn w/ inline `throw createError()` calls ([c9a0fd6](https://github.com/streamich/memfs/commit/c9a0fd6adcfd9fb17a7aa3ccd3e418b83c198771))


### Features

* 🎸 enable TypeScript strict null checks ([1998b24](https://github.com/streamich/memfs/commit/1998b24e65d68ae95183382ed6ed400acf57c535))


### BREAKING CHANGES

* TypeScript strict null checks are now enabled which may
break some TypeScript users.

## [2.17.1](https://github.com/streamich/memfs/compare/v2.17.0...v2.17.1) (2019-11-26)

### Bug Fixes

- set-up semantic-release packages ([0554c7e](https://github.com/streamich/memfs/commit/0554c7e9ae472e4a3f7afe47d5aa990abd7f05bf))

## [2.15.5](https://github.com/streamich/memfs/compare/v2.15.4...v2.15.5) (2019-07-16)

### Bug Fixes

- check for process ([8b9b00c](https://github.com/streamich/memfs/commit/8b9b00c))
- check for process ([#396](https://github.com/streamich/memfs/issues/396)) ([2314dad](https://github.com/streamich/memfs/commit/2314dad))

## [2.15.4](https://github.com/streamich/memfs/compare/v2.15.3...v2.15.4) (2019-06-01)

### Bug Fixes

- 🐛 accept `null` as value in `fromJSON` functions ([9e1af7d](https://github.com/streamich/memfs/commit/9e1af7d))
- 🐛 annotate return type of `toJSON` functions ([6609840](https://github.com/streamich/memfs/commit/6609840))

## [2.15.3](https://github.com/streamich/memfs/compare/v2.15.2...v2.15.3) (2019-06-01)

### Bug Fixes

- 🐛 mocks process.emitWarning for browser compatibility ([e3456b2](https://github.com/streamich/memfs/commit/e3456b2)), closes [#374](https://github.com/streamich/memfs/issues/374)

## [2.15.2](https://github.com/streamich/memfs/compare/v2.15.1...v2.15.2) (2019-02-16)

### Bug Fixes

- 🐛 BigInt type handling ([c640f25](https://github.com/streamich/memfs/commit/c640f25))

## [2.15.1](https://github.com/streamich/memfs/compare/v2.15.0...v2.15.1) (2019-02-09)

### Bug Fixes

- 🐛 show directory path when throwing EISDIR in mkdir ([9dc7007](https://github.com/streamich/memfs/commit/9dc7007))
- 🐛 throw when creating root directory ([f77fa8b](https://github.com/streamich/memfs/commit/f77fa8b)), closes [#325](https://github.com/streamich/memfs/issues/325)

# [2.15.0](https://github.com/streamich/memfs/compare/v2.14.2...v2.15.0) (2019-01-27)

### Features

- **volume:** add env variable to suppress fs.promise api warnings ([e6b6d0a](https://github.com/streamich/memfs/commit/e6b6d0a))

## [2.14.2](https://github.com/streamich/memfs/compare/v2.14.1...v2.14.2) (2018-12-11)

### Bug Fixes

- fds to start from 0x7fffffff instead of 0xffffffff ([#277](https://github.com/streamich/memfs/issues/277)) ([31e44ba](https://github.com/streamich/memfs/commit/31e44ba))

## [2.14.1](https://github.com/streamich/memfs/compare/v2.14.0...v2.14.1) (2018-11-29)

### Bug Fixes

- don't copy legacy files into dist ([ab8ffbb](https://github.com/streamich/memfs/commit/ab8ffbb)), closes [#263](https://github.com/streamich/memfs/issues/263)

# [2.14.0](https://github.com/streamich/memfs/compare/v2.13.1...v2.14.0) (2018-11-12)

### Features

- add bigint option support ([00a017e](https://github.com/streamich/memfs/commit/00a017e))

## [2.13.1](https://github.com/streamich/memfs/compare/v2.13.0...v2.13.1) (2018-11-11)

### Bug Fixes

- 🐛 don't install semantic-release, incompat with old Node ([cd2b69c](https://github.com/streamich/memfs/commit/cd2b69c))
