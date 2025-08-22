import { FLAG } from '../FLAG';
import * as fs from 'fs';
import * as path from 'path';
import { memfs } from '../../index';

describe('FLAG constants compatibility', () => {
  const testFile = path.join(__dirname, 'flag_test.txt');

  afterEach(() => {
    try {
      fs.unlinkSync(testFile);
    } catch {
      // ignore
    }
  });

  test('FLAG constants should be properly exported as an object', () => {
    expect(FLAG).toBeDefined();
    expect(typeof FLAG).toBe('object');
    expect(FLAG.O_RDONLY).toBe(0);
    expect(FLAG.O_WRONLY).toBe(1);
    expect(FLAG.O_RDWR).toBe(2);
    expect(FLAG.O_CREAT).toBe(64);
    expect(FLAG.O_EXCL).toBe(128);
    expect(FLAG.O_TRUNC).toBe(512);
    expect(FLAG.O_APPEND).toBe(1024);
  });

  test('FLAG constants should match Node.js fs.constants', () => {
    const nodeConstants = fs.constants;

    expect(FLAG.O_RDONLY).toBe(nodeConstants.O_RDONLY);
    expect(FLAG.O_WRONLY).toBe(nodeConstants.O_WRONLY);
    expect(FLAG.O_RDWR).toBe(nodeConstants.O_RDWR);
    expect(FLAG.O_CREAT).toBe(nodeConstants.O_CREAT);
    expect(FLAG.O_EXCL).toBe(nodeConstants.O_EXCL);
    expect(FLAG.O_TRUNC).toBe(nodeConstants.O_TRUNC);
    expect(FLAG.O_APPEND).toBe(nodeConstants.O_APPEND);
    expect(FLAG.O_SYNC).toBe(nodeConstants.O_SYNC);
  });

  test('FLAG constants should work with native fs.promises.open', async () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const flags = FLAG.O_RDWR | FLAG.O_CREAT;

    const handle = await fs.promises.open(testFile, flags);
    await handle.write(data, 0, data.length, 0);
    await handle.close();

    expect(fs.existsSync(testFile)).toBe(true);
    const content = fs.readFileSync(testFile);
    expect(content).toEqual(Buffer.from(data));
  });

  test('FLAG constants should work with memfs', async () => {
    const { fs: memfsInstance } = memfs();
    const data = new Uint8Array([87, 111, 114, 108, 100]); // "World"
    const flags = FLAG.O_RDWR | FLAG.O_CREAT;
    const memfsFile = '/test_flag_file.txt';

    const handle = await memfsInstance.promises.open(memfsFile, flags);
    await handle.write(data, 0, data.length, 0);
    await handle.close();

    expect(memfsInstance.existsSync(memfsFile)).toBe(true);
    const content = memfsInstance.readFileSync(memfsFile);
    expect(content).toEqual(Buffer.from(data));
  });

  test('Exclusive create flag should work correctly', async () => {
    const data = new Uint8Array([84, 101, 115, 116]); // "Test"
    const flags = FLAG.O_WRONLY | FLAG.O_CREAT | FLAG.O_EXCL;

    // First create should succeed
    const handle1 = await fs.promises.open(testFile, flags);
    await handle1.write(data, 0, data.length, 0);
    await handle1.close();

    // Second create should fail with EEXIST
    await expect(fs.promises.open(testFile, flags)).rejects.toMatchObject({
      code: 'EEXIST',
    });
  });
});
