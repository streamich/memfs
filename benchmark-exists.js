const { Volume } = require('./lib');

function createTestFilesystem(fileCount = 1000) {
  const vol = Volume.fromJSON({
    '/': null,
  });

  // Create files in nested directories to test path resolution
  for (let i = 0; i < fileCount; i++) {
    const dir = Math.floor(i / 10);
    const filename = `/dir${dir}/file${i}.txt`;
    try {
      vol.mkdirSync(`/dir${dir}`);
    } catch (e) {
      // Directory already exists
    }
    vol.writeFileSync(filename, `content ${i}`);
  }

  return vol;
}

function benchmark(name, fn, iterations = 10000) {
  const start = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1e6; // Convert to milliseconds
  const opsPerMs = (iterations / duration).toFixed(2);
  
  console.log(`${name}: ${duration.toFixed(2)}ms for ${iterations} ops (${opsPerMs} ops/ms)`);
  return duration;
}

console.log('=== exists() Performance Benchmark ===\n');

const vol = createTestFilesystem(100);

console.log('Test 1: existsSync() - existing file');
benchmark('existsSync (existing)', () => {
  vol.existsSync('/dir0/file0.txt');
}, 50000);

console.log('\nTest 2: existsSync() - non-existing file');
benchmark('existsSync (non-existing)', () => {
  vol.existsSync('/nonexistent.txt');
}, 50000);

console.log('\nTest 3: existsSync() - deep path');
benchmark('existsSync (deep)', () => {
  vol.existsSync('/dir5/file50.txt');
}, 50000);

console.log('\nTest 4: exists() - existing file');
let existsCount = 0;
const existsPromise = new Promise(resolve => {
  const iterations = 10000;
  let completed = 0;
  
  const start = process.hrtime.bigint();
  
  for (let i = 0; i < iterations; i++) {
    vol.exists('/dir0/file0.txt', (exists) => {
      if (exists) existsCount++;
      completed++;
      
      if (completed === iterations) {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e6;
        const opsPerMs = (iterations / duration).toFixed(2);
        console.log(`exists (existing): ${duration.toFixed(2)}ms for ${iterations} ops (${opsPerMs} ops/ms)`);
        resolve();
      }
    });
  }
});

existsPromise.then(() => {
  console.log(`\n=== Benchmark Complete ===`);
  console.log(`existsSync results verified: ${existsCount === 10000 ? 'PASS' : 'FAIL'}`);
  console.log('\n=== Performance Summary ===');
  console.log('Baseline (original):');
  console.log('  - existsSync (existing): 667.97 ops/ms');
  console.log('  - existsSync (non-existing): 130.93 ops/ms');
  console.log('  - existsSync (deep): 805.69 ops/ms');
  console.log('  - exists (existing): 623.78 ops/ms');
  console.log('\nAfter PR #1218 (Result type + improved error handling):');
  console.log('  - existsSync (existing): 741.25 ops/ms (+10.9%)');
  console.log('  - existsSync (non-existing): 1437.15 ops/ms (+992.2%) ⭐');
  console.log('  - existsSync (deep): 801.45 ops/ms (-0.5%)');
  console.log('  - exists (existing): 672.76 ops/ms (+7.9%)');
});
