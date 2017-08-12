const errors = require('../src/internal/errors');

const err = new errors.TypeError('ENOENT', 'Test');
console.log(err);
