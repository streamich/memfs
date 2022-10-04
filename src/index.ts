import fs from './index-esm';

export * from './index-esm';

declare let module;
module.exports = { ...module.exports, ...fs };

module.exports.semantic = true;
