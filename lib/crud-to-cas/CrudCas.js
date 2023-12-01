"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudCas = void 0;
const util_1 = require("./util");
const normalizeErrors = async (code) => {
    try {
        return await code();
    }
    catch (error) {
        if (error && typeof error === 'object') {
            switch (error.name) {
                case 'ResourceNotFound':
                case 'CollectionNotFound':
                    throw new DOMException(error.message, 'BlobNotFound');
            }
        }
        throw error;
    }
};
class CrudCas {
    constructor(crud, options) {
        this.crud = crud;
        this.options = options;
        this.put = async (blob) => {
            const digest = await this.options.hash(blob);
            const [collection, resource] = (0, util_1.hashToLocation)(digest);
            await this.crud.put(collection, resource, blob);
            return digest;
        };
        this.get = async (hash, options) => {
            const [collection, resource] = (0, util_1.hashToLocation)(hash);
            return await normalizeErrors(async () => {
                const blob = await this.crud.get(collection, resource);
                if (!(options === null || options === void 0 ? void 0 : options.skipVerification)) {
                    const digest = await this.options.hash(blob);
                    if (hash !== digest)
                        throw new DOMException('Blob contents does not match hash', 'Integrity');
                }
                return blob;
            });
        };
        this.del = async (hash, silent) => {
            const [collection, resource] = (0, util_1.hashToLocation)(hash);
            await normalizeErrors(async () => {
                return await this.crud.del(collection, resource, silent);
            });
        };
        this.info = async (hash) => {
            const [collection, resource] = (0, util_1.hashToLocation)(hash);
            return await normalizeErrors(async () => {
                return await this.crud.info(collection, resource);
            });
        };
    }
}
exports.CrudCas = CrudCas;
//# sourceMappingURL=CrudCas.js.map