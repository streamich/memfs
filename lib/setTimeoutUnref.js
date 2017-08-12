"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * `setTimeoutUnref` is just like `setTimeout`, only in Node's environment it will "unref" its macro task.
 * @param callback
 * @param time
 * @param args
 * @returns {any}
 */
function setTimeoutUnref(callback, time, args) {
    var ref = setTimeout.apply(null, arguments);
    /* istanbul ignore next */
    if (ref && (typeof ref === 'object') && (typeof ref.unref === 'function'))
        ref.unref();
    return ref;
}
exports.default = setTimeoutUnref;
