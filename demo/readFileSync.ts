import {fs} from '../src/index';


fs.writeFileSync('/test.txt', 'hello...');
console.log(fs.readFileSync('/test.txt', 'utf8'));
