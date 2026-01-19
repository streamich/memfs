/**
 * Test cases for Volume snapshot functionality
 * Tests cover all snapshot formats: native, binary, and JSON
 * Both synchronous and asynchronous APIs are tested
 */

import { Volume } from '../volume';

describe('Volume.Snapshot - Native Format', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  describe('toSnapshotSync', () => {
    it('should snapshot an empty filesystem', () => {
      const snapshot = vol.toSnapshot();
      expect(snapshot).toBeTruthy();
      expect(snapshot![0]).toBe(0); // Folder type
      expect(Object.keys(snapshot![2] as any).length).toBe(0); // No entries
    });

    it('should snapshot a single file', () => {
      vol.writeFileSync('/file.txt', 'hello');
      const snapshot = vol.toSnapshot();
      expect(snapshot!).toBeTruthy();
      expect(snapshot![0]).toBe(0); // Folder type
      expect('file.txt' in (snapshot![2] as any)).toBe(true);
    });

    it('should snapshot multiple files', () => {
      vol.writeFileSync('/file1.txt', 'content1');
      vol.writeFileSync('/file2.txt', 'content2');
      const snapshot = vol.toSnapshot();
      expect('file1.txt' in (snapshot![2] as any)).toBe(true);
      expect('file2.txt' in (snapshot![2] as any)).toBe(true);
    });

    it('should snapshot nested directories', () => {
      vol.mkdirSync('/app/src/components', { recursive: true });
      vol.writeFileSync('/app/src/components/Button.tsx', 'export Button');
      const snapshot = vol.toSnapshot();
      expect('app' in (snapshot![2] as any)).toBe(true);
      const appSnapshot = snapshot![2] as Record<string, any>;
      expect('src' in (appSnapshot['app'][2] as any)).toBe(true);
    });

    it('should snapshot symbolic links', () => {
      vol.writeFileSync('/original.txt', 'content');
      vol.symlinkSync('/original.txt', '/link.txt');
      const snapshot = vol.toSnapshot();
      expect('link.txt' in (snapshot![2] as any)).toBe(true);
      const entries = snapshot![2] as Record<string, any>;
      const linkNode = entries['link.txt'];
      expect(linkNode[0]).toBe(2); // Symlink type
      expect(linkNode[1]).toHaveProperty('target');
    });

    it('should snapshot subdirectory only', () => {
      vol.mkdirSync('/app', { recursive: true });
      vol.writeFileSync('/app/file.txt', 'content');
      vol.writeFileSync('/other.txt', 'other');

      const snapshot = vol.toSnapshot('/app');
      expect('file.txt' in (snapshot![2] as any)).toBe(true);
      expect('other.txt' in (snapshot![2] as any)).toBe(false);
    });

    it('should handle binary file content', () => {
      const buffer = Buffer.from([0xff, 0xfe, 0x00, 0x01]);
      vol.writeFileSync('/binary.bin', buffer);
      const snapshot = vol.toSnapshot();
      const entries = snapshot![2] as Record<string, any>;
      const fileNode = entries['binary.bin'];
      expect(fileNode[0]).toBe(1); // File type
      expect(fileNode[2]).toBeInstanceOf(Uint8Array);
      expect(fileNode[2]).toEqual(new Uint8Array([0xff, 0xfe, 0x00, 0x01]));
    });

    it('should snapshot empty directories', () => {
      vol.mkdirSync('/empty', { recursive: true });
      const snapshot = vol.toSnapshot();
      const entries = snapshot![2] as Record<string, any>;
      const dirNode = entries['empty'];
      expect(dirNode[0]).toBe(0); // Folder type
      expect(Object.keys(dirNode[2] as any).length).toBe(0); // No entries
    });

    it('should snapshot complex filesystem structures', () => {
      vol.mkdirSync('/src/components', { recursive: true });
      vol.mkdirSync('/src/hooks', { recursive: true });
      vol.mkdirSync('/public', { recursive: true });
      vol.writeFileSync('/src/index.ts', 'export default');
      vol.writeFileSync('/src/components/Button.tsx', 'export Button');
      vol.writeFileSync('/src/hooks/useForm.ts', 'export useForm');
      vol.writeFileSync('/public/index.html', '<html></html>');

      const snapshot = vol.toSnapshot();
      expect('src' in (snapshot![2] as any)).toBe(true);
      expect('public' in (snapshot![2] as any)).toBe(true);
    });
  });

  describe('fromSnapshotSync', () => {
    it('should restore from snapshot', () => {
      vol.writeFileSync('/file.txt', 'hello');
      vol.mkdirSync('/dir', { recursive: true });
      vol.writeFileSync('/dir/nested.txt', 'nested');

      const snapshot = vol.toSnapshot();
      const vol2 = new Volume();
      vol2.fromSnapshot(snapshot);

      expect(vol2.readFileSync('/file.txt', 'utf8')).toBe('hello');
      expect(vol2.readFileSync('/dir/nested.txt', 'utf8')).toBe('nested');
    });

    it('should restore to different path', () => {
      vol.writeFileSync('/file.txt', 'content');
      vol.mkdirSync('/subdir', { recursive: true });
      vol.writeFileSync('/subdir/file2.txt', 'content2');

      const snapshot = vol.toSnapshot();
      const vol2 = new Volume();
      vol2.fromSnapshot(snapshot, '/restored');

      expect(vol2.readFileSync('/restored/file.txt', 'utf8')).toBe('content');
      expect(vol2.readFileSync('/restored/subdir/file2.txt', 'utf8')).toBe('content2');
    });

    it('should restore empty filesystem', () => {
      const vol2 = new Volume();
      const snapshot = vol.toSnapshot();
      vol2.fromSnapshot(snapshot);

      const contents = vol2.readdirSync('/');
      expect(contents).toEqual([]);
    });

    it('should restore symbolic links', () => {
      vol.writeFileSync('/target.txt', 'original');
      vol.symlinkSync('/target.txt', '/link.txt');

      const snapshot = vol.toSnapshot();
      const vol2 = new Volume();
      vol2.fromSnapshot(snapshot);

      expect(vol2.readFileSync('/link.txt', 'utf8')).toBe('original');
    });

    it('should restore to subdirectory', () => {
      vol.writeFileSync('/file.txt', 'content');
      vol.mkdirSync('/dir', { recursive: true });
      vol.writeFileSync('/dir/file2.txt', 'content2');

      const snapshot = vol.toSnapshot();
      const vol2 = new Volume();
      vol2.mkdirSync('/existing', { recursive: true });
      vol2.fromSnapshot(snapshot, '/existing/restored');

      expect(vol2.readFileSync('/existing/restored/file.txt', 'utf8')).toBe('content');
    });

    it('should overwrite existing files during restore', () => {
      const vol2 = new Volume();
      vol2.writeFileSync('/file.txt', 'old content');

      vol.writeFileSync('/file.txt', 'new content');
      const snapshot = vol.toSnapshot();
      vol2.fromSnapshot(snapshot);

      expect(vol2.readFileSync('/file.txt', 'utf8')).toBe('new content');
    });

    it('should handle binary content in restore', () => {
      const buffer = Buffer.from([0xff, 0xfe, 0x00, 0x01]);
      vol.writeFileSync('/binary.bin', buffer);

      const snapshot = vol.toSnapshot();
      const vol2 = new Volume();
      vol2.fromSnapshot(snapshot);

      const restored = vol2.readFileSync('/binary.bin') as Buffer;
      expect(restored).toEqual(buffer);
    });
  });
});

describe('Volume.Snapshot - Binary Format', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  describe('toBinarySnapshotSync', () => {
    it('should create binary snapshot', () => {
      vol.writeFileSync('/file.txt', 'hello');
      const binary = vol.toBinarySnapshot();

      expect(binary).toBeInstanceOf(Uint8Array);
      expect(binary.length).toBeGreaterThan(0);
    });

    it('should handle empty filesystem', () => {
      const binary = vol.toBinarySnapshot();
      expect(binary).toBeInstanceOf(Uint8Array);
    });

    it('should snapshot subdirectory to binary', () => {
      vol.mkdirSync('/app/src', { recursive: true });
      vol.writeFileSync('/app/src/file.ts', 'export default');
      vol.writeFileSync('/other.txt', 'other');

      const binary = vol.toBinarySnapshot('/app');
      expect(binary).toBeInstanceOf(Uint8Array);
    });
  });

  describe('fromBinarySnapshotSync', () => {
    it('should restore from binary snapshot', () => {
      vol.writeFileSync('/file.txt', 'hello');
      vol.mkdirSync('/dir', { recursive: true });
      vol.writeFileSync('/dir/file2.txt', 'world');

      const binary = vol.toBinarySnapshot();
      const vol2 = new Volume();
      vol2.fromBinarySnapshot(binary);

      expect(vol2.readFileSync('/file.txt', 'utf8')).toBe('hello');
      expect(vol2.readFileSync('/dir/file2.txt', 'utf8')).toBe('world');
    });

    it('should round-trip binary snapshot', () => {
      vol.writeFileSync('/file.txt', 'content');
      vol.mkdirSync('/nested/deep', { recursive: true });
      vol.writeFileSync('/nested/deep/file.txt', 'nested content');

      const binary1 = vol.toBinarySnapshot();
      const vol2 = new Volume();
      vol2.fromBinarySnapshot(binary1);

      const binary2 = vol2.toBinarySnapshot();
      const vol3 = new Volume();
      vol3.fromBinarySnapshot(binary2);

      expect(vol3.readFileSync('/file.txt', 'utf8')).toBe('content');
      expect(vol3.readFileSync('/nested/deep/file.txt', 'utf8')).toBe('nested content');
    });

    it('should restore to different path', () => {
      vol.writeFileSync('/file.txt', 'content');
      const binary = vol.toBinarySnapshot();

      const vol2 = new Volume();
      vol2.fromBinarySnapshot(binary, '/restored');

      expect(vol2.readFileSync('/restored/file.txt', 'utf8')).toBe('content');
    });

    it('should preserve binary file content', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);
      vol.writeFileSync('/binary.bin', buffer);

      const binary = vol.toBinarySnapshot();
      const vol2 = new Volume();
      vol2.fromBinarySnapshot(binary);

      const restored = vol2.readFileSync('/binary.bin') as Buffer;
      expect(restored).toEqual(buffer);
    });
  });
});

describe('Volume.Snapshot - JSON Format', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  describe('toJsonSnapshotSync / fromJsonSnapshotSync', () => {
    it('should serialize to JSON string', () => {
      vol.writeFileSync('/file.txt', 'hello');
      const json = vol.toJsonSnapshot();

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should deserialize from JSON string', () => {
      vol.writeFileSync('/file.txt', 'hello');
      const json = vol.toJsonSnapshot();

      const vol2 = new Volume();
      vol2.fromJsonSnapshot(json);

      expect(vol2.readFileSync('/file.txt', 'utf8')).toBe('hello');
    });

    it('should preserve UTF-8 text content', () => {
      vol.writeFileSync('/emoji.txt', '😀🎉🚀');
      const json = vol.toJsonSnapshot();

      const vol2 = new Volume();
      vol2.fromJsonSnapshot(json);

      expect(vol2.readFileSync('/emoji.txt', 'utf8')).toBe('😀🎉🚀');
    });

    it('should handle nested directories', () => {
      vol.mkdirSync('/src/components/ui', { recursive: true });
      vol.writeFileSync('/src/index.ts', 'export default');
      vol.writeFileSync('/src/components/Button.tsx', 'export Button');

      const json = vol.toJsonSnapshot();
      const vol2 = new Volume();
      vol2.fromJsonSnapshot(json);

      expect(vol2.readFileSync('/src/index.ts', 'utf8')).toBe('export default');
      expect(vol2.readFileSync('/src/components/Button.tsx', 'utf8')).toBe('export Button');
    });

    it('should round-trip JSON snapshot', () => {
      vol.writeFileSync('/file.txt', 'content');
      vol.mkdirSync('/dir', { recursive: true });

      const json1 = vol.toJsonSnapshot();
      const vol2 = new Volume();
      vol2.fromJsonSnapshot(json1);

      const json2 = vol2.toJsonSnapshot();
      const vol3 = new Volume();
      vol3.fromJsonSnapshot(json2);

      expect(vol3.readFileSync('/file.txt', 'utf8')).toBe('content');
    });
  });
});

describe('Volume.Snapshot - Edge Cases', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  it('should handle large files', () => {
    const largeContent = 'x'.repeat(1024 * 1024); // 1MB
    vol.writeFileSync('/large.txt', largeContent);

    const snapshot = vol.toSnapshot();
    const vol2 = new Volume();
    vol2.fromSnapshot(snapshot);

    expect(vol2.readFileSync('/large.txt', 'utf8')).toHaveLength(1024 * 1024);
  });

  it('should handle many small files', () => {
    for (let i = 0; i < 100; i++) {
      vol.writeFileSync(`/file${i}.txt`, `content${i}`);
    }

    const snapshot = vol.toSnapshot();
    const vol2 = new Volume();
    vol2.fromSnapshot(snapshot);

    expect((vol2.readdirSync('/') as string[]).length).toBe(100);
  });

  it('should handle deep directory nesting', () => {
    let path = '/';
    for (let i = 0; i < 20; i++) {
      path += `level${i}/`;
    }
    vol.mkdirSync(path, { recursive: true });
    vol.writeFileSync(path + 'deep.txt', 'deeply nested');

    const snapshot = vol.toSnapshot();
    const vol2 = new Volume();
    vol2.fromSnapshot(snapshot);

    expect(vol2.readFileSync(path + 'deep.txt', 'utf8')).toBe('deeply nested');
  });

  it('should handle special characters in filenames', () => {
    vol.writeFileSync('/file with spaces.txt', 'content');
    vol.writeFileSync('/file-with-dashes.txt', 'content');
    vol.writeFileSync('/file_with_underscores.txt', 'content');
    vol.writeFileSync('/file.multiple.dots.txt', 'content');

    const snapshot = vol.toSnapshot();
    const vol2 = new Volume();
    vol2.fromSnapshot(snapshot);

    expect(vol2.existsSync('/file with spaces.txt')).toBe(true);
    expect(vol2.existsSync('/file-with-dashes.txt')).toBe(true);
    expect(vol2.existsSync('/file_with_underscores.txt')).toBe(true);
    expect(vol2.existsSync('/file.multiple.dots.txt')).toBe(true);
  });

  it('should handle null snapshot (undefined)', () => {
    const vol2 = new Volume();
    vol2.fromSnapshot(null as any);
    expect(vol2.readdirSync('/')).toEqual([]);
  });

  it('should handle symlinks to non-existent targets', () => {
    vol.symlinkSync('/nonexistent', '/link');
    const snapshot = vol.toSnapshot();

    const vol2 = new Volume();
    vol2.fromSnapshot(snapshot);
    expect(vol2.readlinkSync('/link')).toBe('/nonexistent');
  });
});

describe('Volume.Snapshot - Format Conversion', () => {
  let vol: Volume;

  beforeEach(() => {
    vol = new Volume();
  });

  it('should convert between formats correctly', () => {
    vol.writeFileSync('/file.txt', 'content');
    vol.mkdirSync('/dir', { recursive: true });
    vol.writeFileSync('/dir/file2.txt', 'content2');

    // Native to Binary
    const snapshot = vol.toSnapshot();
    const vol2 = new Volume();
    vol2.fromSnapshot(snapshot);
    const binary = vol2.toBinarySnapshot();

    // Binary to JSON
    const vol3 = new Volume();
    vol3.fromBinarySnapshot(binary);
    const json = vol3.toJsonSnapshot();

    // JSON back to Native
    const vol4 = new Volume();
    vol4.fromJsonSnapshot(json);

    expect(vol4.readFileSync('/file.txt', 'utf8')).toBe('content');
    expect(vol4.readFileSync('/dir/file2.txt', 'utf8')).toBe('content2');
  });

  it('should preserve all data through format conversions', () => {
    const buffer = Buffer.from([0xff, 0xfe, 0x00, 0x01]);
    vol.writeFileSync('/binary.bin', buffer);
    vol.writeFileSync('/text.txt', '😀 Unicode');
    vol.symlinkSync('/text.txt', '/link');
    vol.mkdirSync('/empty', { recursive: true });

    // Round-trip through all formats
    let snapshot = vol.toSnapshot();
    let vol2 = new Volume();
    vol2.fromSnapshot(snapshot);

    let binary = vol2.toBinarySnapshot();
    vol2 = new Volume();
    vol2.fromBinarySnapshot(binary);

    let json = vol2.toJsonSnapshot();
    vol2 = new Volume();
    vol2.fromJsonSnapshot(json);

    expect(vol2.readFileSync('/binary.bin') as Buffer).toEqual(buffer);
    expect(vol2.readFileSync('/text.txt', 'utf8')).toBe('😀 Unicode');
    expect(vol2.readlinkSync('/link')).toBe('/text.txt');
    expect(vol2.statSync('/empty').isDirectory()).toBe(true);
  });
});
