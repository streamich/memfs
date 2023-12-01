"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const util_1 = require("../../__tests__/util");
const node_to_fsa_1 = require("../../node-to-fsa");
const FsaCrud_1 = require("../FsaCrud");
const testCrudfs_1 = require("../../crud/__tests__/testCrudfs");
const setup = () => {
    const { fs } = (0, __1.memfs)();
    const fsa = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
    const crud = new FsaCrud_1.FsaCrud(fsa);
    return { fs, fsa, crud, snapshot: () => fs.__vol.toJSON() };
};
(0, util_1.onlyOnNode20)('FsaCrud', () => {
    (0, testCrudfs_1.testCrudfs)(setup);
});
//# sourceMappingURL=FsaCrud.test.js.map