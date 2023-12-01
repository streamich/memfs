"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const util_1 = require("../../__tests__/util");
const node_to_fsa_1 = require("../../node-to-fsa");
const fsa_to_node_1 = require("../../fsa-to-node");
const node_to_crud_1 = require("../../node-to-crud");
const testCrudfs_1 = require("../../crud/__tests__/testCrudfs");
const fsa_to_crud_1 = require("../../fsa-to-crud");
(0, util_1.onlyOnNode20)('CRUD matryoshka', () => {
    describe('crud(memfs)', () => {
        (0, testCrudfs_1.testCrudfs)(() => {
            const { fs } = (0, __1.memfs)();
            const crud = new node_to_crud_1.NodeCrud({ fs: fs.promises, dir: '/' });
            return { crud, snapshot: () => fs.__vol.toJSON() };
        });
    });
    describe('crud(fsa(memfs))', () => {
        (0, testCrudfs_1.testCrudfs)(() => {
            const { fs } = (0, __1.memfs)();
            const fsa = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
            const crud = new fsa_to_crud_1.FsaCrud(fsa);
            return { crud, snapshot: () => fs.__vol.toJSON() };
        });
    });
    describe('crud(fs(fsa(memfs)))', () => {
        (0, testCrudfs_1.testCrudfs)(() => {
            const { fs } = (0, __1.memfs)();
            const fsa = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
            const fs2 = new fsa_to_node_1.FsaNodeFs(fsa);
            const crud = new node_to_crud_1.NodeCrud({ fs: fs2.promises, dir: '/' });
            return { crud, snapshot: () => fs.__vol.toJSON() };
        });
    });
    describe('crud(fsa(fs(fsa(memfs))))', () => {
        (0, testCrudfs_1.testCrudfs)(() => {
            const { fs } = (0, __1.memfs)();
            const fsa = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
            const fs2 = new fsa_to_node_1.FsaNodeFs(fsa);
            const fsa2 = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs2, '/', { mode: 'readwrite' });
            const crud = new fsa_to_crud_1.FsaCrud(fsa2);
            return { crud, snapshot: () => fs.__vol.toJSON() };
        });
    });
    describe('crud(fs(fsa(fs(fsa(memfs)))))', () => {
        (0, testCrudfs_1.testCrudfs)(() => {
            const { fs } = (0, __1.memfs)();
            const fsa = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
            const fs2 = new fsa_to_node_1.FsaNodeFs(fsa);
            const fsa2 = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs2, '/', { mode: 'readwrite' });
            const fs3 = new fsa_to_node_1.FsaNodeFs(fsa2);
            const crud = new node_to_crud_1.NodeCrud({ fs: fs3.promises, dir: '/' });
            return { crud, snapshot: () => fs.__vol.toJSON() };
        });
    });
    describe('crud(fsa(fs(fsa(fs(fsa(memfs))))))', () => {
        (0, testCrudfs_1.testCrudfs)(() => {
            const { fs } = (0, __1.memfs)();
            const fsa = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs, '/', { mode: 'readwrite' });
            const fs2 = new fsa_to_node_1.FsaNodeFs(fsa);
            const fsa2 = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs2, '/', { mode: 'readwrite' });
            const fs3 = new fsa_to_node_1.FsaNodeFs(fsa2);
            const fsa3 = new node_to_fsa_1.NodeFileSystemDirectoryHandle(fs3, '/', { mode: 'readwrite' });
            const crud = new fsa_to_crud_1.FsaCrud(fsa3);
            return { crud, snapshot: () => fs.__vol.toJSON() };
        });
    });
});
//# sourceMappingURL=matryoshka.test.js.map