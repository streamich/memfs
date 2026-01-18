const errors = require('../lib/vendor/node/internal/errors');

const err = new errors.TypeError('ERR_INVALID_OPT_VALUE_ENCODING', 'Test');
console.log(err);
