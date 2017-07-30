import {mountSync, readFileSync} from '../src/index';


mountSync('/', {
    'test.txt': 'Hello world...',
});


