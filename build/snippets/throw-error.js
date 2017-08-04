var errors = require('../src/internal/errors');
var err = new errors.TypeError('ENOENT', 'Test');
console.log(err);
