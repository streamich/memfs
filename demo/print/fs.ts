// Run: npx ts-node demo/print/fs.ts

import * as fs from 'fs';
import { toTreeSync } from '../../src/print';

console.log(toTreeSync(<any>fs, { dir: process.cwd() + '/src/fsa-to-node' }));

// Output:
// src/
// ├─ Dirent.ts
// ├─ Stats.ts
// ├─ __tests__/
// │  ├─ hasBigInt.js
// │  ├─ index.test.ts
// │  ├─ node.test.ts
// │  ├─ process.test.ts
// │  ├─ promises.test.ts
// │  ├─ setImmediate.test.ts
// │  ├─ setTimeoutUnref.test.ts
// │  ├─ util.ts
// │  ├─ volume/
// │  │  ├─ ReadStream.test.ts
// │  │  ├─ WriteStream.test.ts
// │  │  ├─ __snapshots__/
// │  │  │  ├─ mkdirSync.test.ts.snap
// │  │  │  ├─ renameSync.test.ts.snap
// │  │  │  └─ writeSync.test.ts.snap
// │  │  ├─ appendFile.test.ts
// │  │  ├─ appendFileSync.test.ts
// │  │  ├─ closeSync.test.ts
// │  │  ├─ copyFile.test.ts
// │  │  ├─ copyFileSync.test.ts
// │  │  ├─ exists.test.ts
// │  │  ├─ existsSync.test.ts
// │  │  ├─ mkdirSync.test.ts
// │  │  ├─ openSync.test.ts
// │  │  ├─ readFile.test.ts
// │  │  ├─ readSync.test.ts
// │  │  ├─ readdirSync.test.ts
// │  │  ├─ realpathSync.test.ts
// │  │  ├─ rename.test.ts
// │  │  ├─ renameSync.test.ts
// │  │  ├─ rmPromise.test.ts
// │  │  ├─ rmSync.test.ts
// │  │  ├─ statSync.test.ts
// │  │  ├─ toString.test.ts
// │  │  ├─ write.test.ts
// │  │  ├─ writeFileSync.test.ts
// │  │  └─ writeSync.test.ts
// │  └─ volume.test.ts
// ├─ cas/
// │  ├─ README.md
// │  └─ types.ts
// ├─ constants.ts
// ├─ consts/
// │  ├─ AMODE.ts
// │  └─ FLAG.ts
// ├─ crud/
// │  ├─ README.md
// │  ├─ __tests__/
// │  │  ├─ matryoshka.test.ts
// │  │  └─ testCrudfs.ts
// │  ├─ types.ts
// │  └─ util.ts
// ├─ crud-to-cas/
// │  ├─ CrudCas.ts
// │  ├─ __tests__/
// │  │  ├─ CrudCas.test.ts
// │  │  ├─ __snapshots__/
// │  │  │  └─ CrudCas.test.ts.snap
// │  │  └─ testCasfs.ts
// │  ├─ index.ts
// │  └─ util.ts
// ├─ encoding.ts
// ├─ fsa/
// │  └─ types.ts
// ├─ fsa-to-crud/
// │  ├─ FsaCrud.ts
// │  ├─ __tests__/
// │  │  └─ FsaCrud.test.ts
// │  ├─ index.ts
// │  └─ util.ts
// ├─ fsa-to-node/
// │  ├─ FsaNodeCore.ts
// │  ├─ FsaNodeDirent.ts
// │  ├─ FsaNodeFs.ts
// │  ├─ FsaNodeFsOpenFile.ts
// │  ├─ FsaNodeReadStream.ts
// │  ├─ FsaNodeStats.ts
// │  ├─ FsaNodeWriteStream.ts
// │  ├─ __tests__/
// │  │  ├─ FsaNodeFs.test.ts
// │  │  └─ util.test.ts
// │  ├─ constants.ts
// │  ├─ index.ts
// │  ├─ json.ts
// │  ├─ types.ts
// │  ├─ util.ts
// │  └─ worker/
// │     ├─ FsaNodeSyncAdapterWorker.ts
// │     ├─ FsaNodeSyncWorker.ts
// │     ├─ SyncMessenger.ts
// │     ├─ constants.ts
// │     └─ types.ts
// ├─ index.ts
// ├─ internal/
// │  ├─ buffer.ts
// │  └─ errors.ts
// ├─ node/
// │  ├─ FileHandle.ts
// │  ├─ FsPromises.ts
// │  ├─ constants.ts
// │  ├─ lists/
// │  │  ├─ fsCallbackApiList.ts
// │  │  ├─ fsCommonObjectsList.ts
// │  │  └─ fsSynchronousApiList.ts
// │  ├─ options.ts
// │  ├─ types/
// │  │  ├─ FsCallbackApi.ts
// │  │  ├─ FsCommonObjects.ts
// │  │  ├─ FsPromisesApi.ts
// │  │  ├─ FsSynchronousApi.ts
// │  │  ├─ index.ts
// │  │  ├─ misc.ts
// │  │  └─ options.ts
// │  └─ util.ts
// ├─ node-to-crud/
// │  ├─ NodeCrud.ts
// │  ├─ __tests__/
// │  │  └─ FsaCrud.test.ts
// │  └─ index.ts
// ├─ node-to-fsa/
// │  ├─ NodeFileSystemDirectoryHandle.ts
// │  ├─ NodeFileSystemFileHandle.ts
// │  ├─ NodeFileSystemHandle.ts
// │  ├─ NodeFileSystemSyncAccessHandle.ts
// │  ├─ NodeFileSystemWritableFileStream.ts
// │  ├─ NodePermissionStatus.ts
// │  ├─ README.md
// │  ├─ __tests__/
// │  │  ├─ NodeFileSystemDirectoryHandle.test.ts
// │  │  ├─ NodeFileSystemFileHandle.test.ts
// │  │  ├─ NodeFileSystemHandle.test.ts
// │  │  ├─ NodeFileSystemSyncAccessHandle.test.ts
// │  │  ├─ NodeFileSystemWritableFileStream.test.ts
// │  │  ├─ scenarios.test.ts
// │  │  └─ util.test.ts
// │  ├─ index.ts
// │  ├─ types.ts
// │  └─ util.ts
// ├─ node.ts
// ├─ print/
// │  ├─ __tests__/
// │  │  └─ index.test.ts
// │  └─ index.ts
// ├─ process.ts
// ├─ setImmediate.ts
// ├─ setTimeoutUnref.ts
// ├─ volume-localstorage.ts
// ├─ volume.ts
// └─ webfs/
//    ├─ index.ts
//    └─ webpack.config.js
