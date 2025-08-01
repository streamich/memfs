# Testing with memfs

memfs is particularly useful for testing because it provides a completely isolated, predictable file system that doesn't interact with your actual disk.

## Basic Testing Setup

### Jest Example

```js
import { vol } from 'memfs';

describe('File operations', () => {
  beforeEach(() => {
    // Reset the file system before each test
    vol.reset();
  });

  test('should create and read files', () => {
    vol.writeFileSync('/test.txt', 'test content');
    const content = vol.readFileSync('/test.txt', 'utf8');
    expect(content).toBe('test content');
  });

  test('should handle JSON files', () => {
    const data = { name: 'test', version: '1.0.0' };
    vol.writeFileSync('/package.json', JSON.stringify(data));

    const content = JSON.parse(vol.readFileSync('/package.json', 'utf8'));
    expect(content.name).toBe('test');
    expect(content.version).toBe('1.0.0');
  });
});
```

### Mocha Example

```js
import { vol } from 'memfs';
import { expect } from 'chai';

describe('File system tests', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('should support directory operations', () => {
    vol.mkdirSync('/projects');
    vol.mkdirSync('/projects/myapp');
    vol.writeFileSync('/projects/myapp/index.js', 'console.log("Hello");');

    const dirs = vol.readdirSync('/projects');
    expect(dirs).to.include('myapp');

    const files = vol.readdirSync('/projects/myapp');
    expect(files).to.include('index.js');
  });
});
```

## Testing File System Interactions

### Mocking Node.js fs Module

Use with libraries like `fs-monkey` to completely replace Node.js fs:

```js
import { vol } from 'memfs';
import { patchFs } from 'fs-monkey';

describe('Code that uses fs', () => {
  let restoreFs;

  beforeEach(() => {
    vol.reset();
    vol.fromJSON({
      '/app/config.json': JSON.stringify({ database: 'sqlite' }),
      '/app/data/users.json': JSON.stringify([{ id: 1, name: 'John' }]),
    });

    // Replace Node.js fs with memfs
    restoreFs = patchFs(vol);
  });

  afterEach(() => {
    // Restore original fs
    restoreFs();
  });

  test('application reads config correctly', () => {
    // Your application code that uses fs will now use memfs
    const config = require('./my-app').loadConfig('/app/config.json');
    expect(config.database).toBe('sqlite');
  });
});
```

### Testing Async Operations

```js
import { vol } from 'memfs';
import { promisify } from 'util';

describe('Async file operations', () => {
  beforeEach(() => {
    vol.reset();
  });

  test('should handle promises', async () => {
    const writeFile = promisify(vol.writeFile.bind(vol));
    const readFile = promisify(vol.readFile.bind(vol));

    await writeFile('/async-test.txt', 'async content');
    const content = await readFile('/async-test.txt', 'utf8');
    expect(content).toBe('async content');
  });

  test('should handle fs promises API', async () => {
    await vol.promises.writeFile('/promise-test.txt', 'promise content');
    const content = await vol.promises.readFile('/promise-test.txt', 'utf8');
    expect(content).toBe('promise content');
  });
});
```

## Advanced Testing Patterns

### Setup Complex File Structures

```js
import { vol } from 'memfs';

function setupProjectStructure() {
  vol.fromJSON({
    '/project/package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      scripts: {
        test: 'jest',
        build: 'webpack',
      },
    }),
    '/project/src/index.js': `
      const config = require('./config');
      module.exports = { config };
    `,
    '/project/src/config.js': 'module.exports = { env: "test" };',
    '/project/tests/index.test.js': 'test("placeholder", () => {});',
    '/project/node_modules/some-module/index.js': 'module.exports = "mock module";',
  });
}

describe('Project structure tests', () => {
  beforeEach(() => {
    vol.reset();
    setupProjectStructure();
  });

  test('should have correct project structure', () => {
    expect(vol.existsSync('/project/package.json')).toBe(true);
    expect(vol.existsSync('/project/src/index.js')).toBe(true);
    expect(vol.existsSync('/project/tests/index.test.js')).toBe(true);
  });
});
```

### Testing Error Conditions

```js
import { vol } from 'memfs';

describe('Error handling', () => {
  beforeEach(() => {
    vol.reset();
  });

  test('should throw ENOENT for missing files', () => {
    expect(() => {
      vol.readFileSync('/nonexistent.txt');
    }).toThrow(/ENOENT/);
  });

  test('should throw EEXIST when creating existing files', () => {
    vol.writeFileSync('/existing.txt', 'content');

    expect(() => {
      vol.writeFileSync('/existing.txt', 'new content', { flag: 'wx' });
    }).toThrow(/EEXIST/);
  });

  test('should handle permission-like errors', () => {
    vol.mkdirSync('/readonly');

    // Simulate readonly behavior by catching and re-throwing
    expect(() => {
      vol.writeFileSync('/readonly/test.txt', 'content');
    }).not.toThrow(); // memfs doesn't enforce permissions, but your app might
  });
});
```

### Integration with Testing Frameworks

#### Testing with Snapshots

```js
import { vol } from 'memfs';

describe('File system snapshots', () => {
  test('should match file system structure', () => {
    vol.fromJSON({
      '/app/index.js': 'console.log("app");',
      '/app/lib/utils.js': 'module.exports = {};',
      '/app/test/index.test.js': 'test("", () => {});',
    });

    const snapshot = vol.toJSON();
    expect(snapshot).toMatchSnapshot();
  });
});
```

#### Parameterized Tests

```js
import { vol } from 'memfs';

describe.each([
  ['text file', '/test.txt', 'text content'],
  ['json file', '/test.json', JSON.stringify({ test: true })],
  ['empty file', '/empty.txt', ''],
])('File operations with %s', (fileType, path, content) => {
  beforeEach(() => {
    vol.reset();
  });

  test(`should handle ${fileType}`, () => {
    vol.writeFileSync(path, content);
    const result = vol.readFileSync(path, 'utf8');
    expect(result).toBe(content);
  });
});
```

## Testing Best Practices

1. **Always reset between tests**: Use `vol.reset()` in `beforeEach` to ensure test isolation
2. **Use descriptive file paths**: Makes debugging easier when tests fail
3. **Test both sync and async operations**: Ensure your code works with both patterns
4. **Mock external dependencies**: Use memfs with fs-monkey to isolate file system interactions
5. **Test error conditions**: Verify your code handles missing files, permission errors, etc.
6. **Use JSON setup for complex structures**: `vol.fromJSON()` is great for setting up complex file trees

## Common Gotchas

- **Path separators**: memfs uses `/` even on Windows in the in-memory representation
- **Encoding**: Always specify encoding when reading text files: `vol.readFileSync(path, 'utf8')`
- **Cleanup**: Remember to call `vol.reset()` between tests to avoid interference
- **Absolute paths**: memfs works with absolute paths; relative paths are resolved from the current working directory

## See Also

- [Getting Started Guide](./getting-started.md)
- [Browser Usage Guide](./browser-usage.md)
- [Node.js fs API Reference](./node/index.md)
- [API Documentation](https://streamich.github.io/memfs/)
