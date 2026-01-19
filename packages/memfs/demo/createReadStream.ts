import { fs } from '../src/index';

fs.writeFileSync('/streamTest', '# Hello World');
const rs = fs.createReadStream('/streamTest', { encoding: 'utf8', start: 0 });
rs.on('data', data => {
  console.log(`data: "${data}"`);
});
rs.on('error', err => {
  console.error('Error:', err);
});
rs.on('end', () => {
  console.log('Stream ended');
});
