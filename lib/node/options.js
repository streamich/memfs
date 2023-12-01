"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWriteFileOptions = exports.writeFileDefaults = exports.getRealpathOptsAndCb = exports.getRealpathOptions = exports.getStatOptsAndCb = exports.getStatOptions = exports.getAppendFileOptsAndCb = exports.getAppendFileOpts = exports.getReaddirOptsAndCb = exports.getReaddirOptions = exports.getReadFileOptions = exports.getRmOptsAndCb = exports.getRmdirOptions = exports.getDefaultOptsAndCb = exports.getDefaultOpts = exports.optsDefaults = exports.optsAndCbGenerator = exports.optsGenerator = exports.getOptions = exports.getMkdirOptions = void 0;
const constants_1 = require("./constants");
const encoding_1 = require("../encoding");
const util_1 = require("./util");
const mkdirDefaults = {
    mode: 511 /* MODE.DIR */,
    recursive: false,
};
const getMkdirOptions = (options) => {
    if (typeof options === 'number')
        return Object.assign({}, mkdirDefaults, { mode: options });
    return Object.assign({}, mkdirDefaults, options);
};
exports.getMkdirOptions = getMkdirOptions;
const ERRSTR_OPTS = tipeof => `Expected options to be either an object or a string, but got ${tipeof} instead`;
function getOptions(defaults, options) {
    let opts;
    if (!options)
        return defaults;
    else {
        const tipeof = typeof options;
        switch (tipeof) {
            case 'string':
                opts = Object.assign({}, defaults, { encoding: options });
                break;
            case 'object':
                opts = Object.assign({}, defaults, options);
                break;
            default:
                throw TypeError(ERRSTR_OPTS(tipeof));
        }
    }
    if (opts.encoding !== 'buffer')
        (0, encoding_1.assertEncoding)(opts.encoding);
    return opts;
}
exports.getOptions = getOptions;
function optsGenerator(defaults) {
    return options => getOptions(defaults, options);
}
exports.optsGenerator = optsGenerator;
function optsAndCbGenerator(getOpts) {
    return (options, callback) => typeof options === 'function' ? [getOpts(), options] : [getOpts(options), (0, util_1.validateCallback)(callback)];
}
exports.optsAndCbGenerator = optsAndCbGenerator;
exports.optsDefaults = {
    encoding: 'utf8',
};
exports.getDefaultOpts = optsGenerator(exports.optsDefaults);
exports.getDefaultOptsAndCb = optsAndCbGenerator(exports.getDefaultOpts);
const rmdirDefaults = {
    recursive: false,
};
const getRmdirOptions = (options) => {
    return Object.assign({}, rmdirDefaults, options);
};
exports.getRmdirOptions = getRmdirOptions;
const getRmOpts = optsGenerator(exports.optsDefaults);
exports.getRmOptsAndCb = optsAndCbGenerator(getRmOpts);
const readFileOptsDefaults = {
    flag: 'r',
};
exports.getReadFileOptions = optsGenerator(readFileOptsDefaults);
const readdirDefaults = {
    encoding: 'utf8',
    withFileTypes: false,
};
exports.getReaddirOptions = optsGenerator(readdirDefaults);
exports.getReaddirOptsAndCb = optsAndCbGenerator(exports.getReaddirOptions);
const appendFileDefaults = {
    encoding: 'utf8',
    mode: 438 /* MODE.DEFAULT */,
    flag: constants_1.FLAGS[constants_1.FLAGS.a],
};
exports.getAppendFileOpts = optsGenerator(appendFileDefaults);
exports.getAppendFileOptsAndCb = optsAndCbGenerator(exports.getAppendFileOpts);
const statDefaults = {
    bigint: false,
};
const getStatOptions = (options = {}) => Object.assign({}, statDefaults, options);
exports.getStatOptions = getStatOptions;
const getStatOptsAndCb = (options, callback) => typeof options === 'function' ? [(0, exports.getStatOptions)(), options] : [(0, exports.getStatOptions)(options), (0, util_1.validateCallback)(callback)];
exports.getStatOptsAndCb = getStatOptsAndCb;
const realpathDefaults = exports.optsDefaults;
exports.getRealpathOptions = optsGenerator(realpathDefaults);
exports.getRealpathOptsAndCb = optsAndCbGenerator(exports.getRealpathOptions);
exports.writeFileDefaults = {
    encoding: 'utf8',
    mode: 438 /* MODE.DEFAULT */,
    flag: constants_1.FLAGS[constants_1.FLAGS.w],
};
exports.getWriteFileOptions = optsGenerator(exports.writeFileDefaults);
//# sourceMappingURL=options.js.map