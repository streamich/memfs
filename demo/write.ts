import {fs} from '../src/index';


const fd = fs.openSync('/test.txt', 'w');
const data = '123';
fs.write(fd, Buffer.from(data), (err, bytes, buf) => {
    // console.log(err, bytes, buf);
    fs.closeSync(fd);
});

