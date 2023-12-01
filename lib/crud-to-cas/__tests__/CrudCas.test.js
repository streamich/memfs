"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const util_1 = require("../../__tests__/util");
const node_to_fsa_1 = require("../../node-to-fsa");
const FsaCrud_1 = require("../../fsa-to-crud/FsaCrud");
const CrudCas_1 = require("../CrudCas");
const testCasfs_1 = require("./testCasfs");
const NodeCrud_1 = require("../../node-to-crud/NodeCrud");
(0, util_1.onlyOnNode20)('CrudCas on FsaCrud', () => {
    const setup = () => {
        const { fs } = (0, __1.memfs)();
        const fsa = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
        const crud = new FsaCrud_1.FsaCrud(fsa);
        const cas = new CrudCas_1.CrudCas(crud, { hash: testCasfs_1.hash });
        return { fs, fsa, crud, cas, snapshot: () => fs.__vol.toJSON() };
    };
    (0, testCasfs_1.testCasfs)(setup);
});
(0, util_1.onlyOnNode20)('CrudCas on NodeCrud at root', () => {
    const setup = () => {
        const { fs } = (0, __1.memfs)();
        const crud = new NodeCrud_1.NodeCrud({ fs: fs.promises, dir: '/' });
        const cas = new CrudCas_1.CrudCas(crud, { hash: testCasfs_1.hash });
        return { fs, crud, cas, snapshot: () => fs.__vol.toJSON() };
    };
    (0, testCasfs_1.testCasfs)(setup);
});
(0, util_1.onlyOnNode20)('CrudCas on NodeCrud at in sub-folder', () => {
    const setup = () => {
        const { fs } = (0, __1.memfs)({ '/a/b/c': null });
        const crud = new NodeCrud_1.NodeCrud({ fs: fs.promises, dir: '/a/b/c' });
        const cas = new CrudCas_1.CrudCas(crud, { hash: testCasfs_1.hash });
        return { fs, crud, cas, snapshot: () => fs.__vol.toJSON() };
    };
    (0, testCasfs_1.testCasfs)(setup);
});
//# sourceMappingURL=CrudCas.test.js.map