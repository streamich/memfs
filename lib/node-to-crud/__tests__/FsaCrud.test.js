"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("../..");
const util_1 = require("../../__tests__/util");
const NodeCrud_1 = require("../NodeCrud");
const testCrudfs_1 = require("../../crud/__tests__/testCrudfs");
const setup = () => {
    const { fs } = (0, __1.memfs)();
    const crud = new NodeCrud_1.NodeCrud({
        fs: fs.promises,
        dir: '/',
    });
    return { fs, crud, snapshot: () => fs.__vol.toJSON() };
};
(0, util_1.onlyOnNode20)('NodeCrud', () => {
    (0, testCrudfs_1.testCrudfs)(setup);
});
//# sourceMappingURL=FsaCrud.test.js.map