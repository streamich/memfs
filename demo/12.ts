const memfs = require('../lib');


memfs.fs.writeFileSync('/watson.json', JSON.stringify({
    "ocorrencia_id": 9001
}));


console.log(memfs.fs.readFileSync('/watson.json', 'utf8'));
