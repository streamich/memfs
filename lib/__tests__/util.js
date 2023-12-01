"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlyOnNode20 = exports.tryGetChildNode = exports.tryGetChild = exports.createFs = exports.create = void 0;
const __1 = require("..");
const create = (json = { '/foo': 'bar' }) => {
    const vol = __1.Volume.fromJSON(json);
    return vol;
};
exports.create = create;
const createFs = (json) => {
    return (0, __1.createFsFromVolume)((0, exports.create)(json));
};
exports.createFs = createFs;
const tryGetChild = (link, name) => {
    const child = link.getChild(name);
    if (!child) {
        throw new Error(`expected link to have a child named "${name}"`);
    }
    return child;
};
exports.tryGetChild = tryGetChild;
const tryGetChildNode = (link, name) => (0, exports.tryGetChild)(link, name).getNode();
exports.tryGetChildNode = tryGetChildNode;
const nodeMajorVersion = +process.version.split('.')[0].slice(1);
/**
 * The `File` global is available only starting in Node v20. Hence we run the
 * tests only in those versions.
 */
exports.onlyOnNode20 = nodeMajorVersion >= 20 ? describe : describe.skip;
//# sourceMappingURL=util.js.map