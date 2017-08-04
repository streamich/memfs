"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Reference = (function () {
    function Reference() {
        this.path = [];
    }
    Reference.prototype.ref = function (path) {
        var ref = new Reference;
        if (path[0] === '/')
            path = path.substr(1);
        ref.path = this.path.concat(path.split('/'));
        return ref;
    };
    return Reference;
}());
exports.Reference = Reference;
