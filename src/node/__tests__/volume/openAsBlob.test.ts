import { of } from 'thingies';
import { memfs } from '../../../';

describe('.openAsBlob()', () => {
  it('can read a text file as blob', async () => {
    const { fs } = memfs({ '/dir/test.txt': 'Hello, World!' });
    const blob = await fs.openAsBlob('/dir/test.txt');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(13);
    expect(blob.type).toBe('');

    const text = await blob.text();
    expect(text).toBe('Hello, World!');
  });

  it('can read a binary file as blob', async () => {
    const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
    const { fs } = memfs({ '/image.png': binaryData });
    const blob = await fs.openAsBlob('/image.png');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(4);

    const arrayBuffer = await blob.arrayBuffer();
    const view = new Uint8Array(arrayBuffer);
    expect(Array.from(view)).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('can specify a mime type', async () => {
    const { fs } = memfs({ '/data.json': '{"key": "value"}' });
    const blob = await fs.openAsBlob('/data.json', { type: 'application/json' });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/json');

    const text = await blob.text();
    expect(text).toBe('{"key": "value"}');
  });

  it('handles empty files', async () => {
    const { fs } = memfs({ '/empty.txt': '' });
    const blob = await fs.openAsBlob('/empty.txt');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(0);

    const text = await blob.text();
    expect(text).toBe('');
  });

  it('throws if file does not exist', async () => {
    const { fs } = memfs({ '/dir/test.txt': 'content' });
    const [, err] = await of(fs.openAsBlob('/dir/test-NOT-FOUND.txt'));
    expect(err).toBeInstanceOf(Error);
    expect((<any>err).code).toBe('ENOENT');
  });

  it('throws EISDIR if path is a directory', async () => {
    const { fs } = memfs({ '/dir/test.txt': 'content' });
    const [, err] = await of(fs.openAsBlob('/dir'));
    expect(err).toBeInstanceOf(Error);
    expect((<any>err).code).toBe('EISDIR');
  });

  it('works with Buffer paths', async () => {
    const { fs } = memfs({ '/test.txt': 'buffer path test' });
    const pathBuffer = Buffer.from('/test.txt');
    const blob = await fs.openAsBlob(pathBuffer);
    expect(blob).toBeInstanceOf(Blob);

    const text = await blob.text();
    expect(text).toBe('buffer path test');
  });

  it('works with different path formats', async () => {
    const { fs } = memfs({ '/path-test.txt': 'path format test' });
    const blob = await fs.openAsBlob('/path-test.txt');
    expect(blob).toBeInstanceOf(Blob);

    const text = await blob.text();
    expect(text).toBe('path format test');
  });

  it('handles large files', async () => {
    const largeContent = 'x'.repeat(10000);
    const { fs } = memfs({ '/large.txt': largeContent });
    const blob = await fs.openAsBlob('/large.txt');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBe(10000);

    const text = await blob.text();
    expect(text).toBe(largeContent);
  });

  it('can read file through symlink', async () => {
    const { fs } = memfs({ '/original.txt': 'symlink test' });
    fs.symlinkSync('/original.txt', '/link.txt');

    const blob = await fs.openAsBlob('/link.txt');
    expect(blob).toBeInstanceOf(Blob);

    const text = await blob.text();
    expect(text).toBe('symlink test');
  });
});
