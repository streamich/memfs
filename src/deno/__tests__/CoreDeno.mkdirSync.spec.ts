import {setupDeno} from "./fixtures";

describe('mkdirSync', () => {
  test('can create a directory at root', () => {
    const { deno, core } = setupDeno();
    expect(core.toJSON()).toEqual({});
    deno.mkdirSync("/test");
    expect(core.toJSON()).toEqual({'/test': null});
  });

  test('can create a deeply nested directory', () => {
    const { deno, core } = setupDeno();
    expect(core.toJSON()).toEqual({});
    deno.mkdirSync("/test/nested", {recursive: true});
    expect(core.toJSON()).toEqual({'/test/nested': null});
  });

  test('can set mode', () => {
    const { deno, core } = setupDeno();
    deno.mkdirSync("/test", {mode: 0o755});
    const stats = core.stat("/test");
    expect(stats.mode & 0o777).toBe(0o755);
    deno.mkdirSync("/test2", {mode: 0o777});
    const stats2 = core.stat("/test2");
    expect(stats2.mode & 0o777).toBe(0o777);
  });

  test('throws if directory exists and recursive is false', () => {
    const { deno } = setupDeno({
      '/test': null
    });
    expect(() => deno.mkdirSync("/test")).toThrow();
    expect(() => deno.mkdirSync("/test", {recursive: false})).toThrow();
    deno.mkdirSync("/test", {recursive: true});
  });

  test('throws if parent directory does not exist and recursive is false', () => {
    const { deno } = setupDeno();
    expect(() => deno.mkdirSync("/test/nested")).toThrow();
    expect(() => deno.mkdirSync("/test/nested", {recursive: false})).toThrow();
    deno.mkdirSync("/test/nested", {recursive: true});
  });

  test('throws if part of the path is a file', () => {
    const { deno } = setupDeno({
      '/file.txt': 'content'
    });
    expect(() => deno.mkdirSync("/file.txt/nested", {recursive: true})).toThrow();
  });

  test('accepts URL as path', () => {
    const { deno, core } = setupDeno();
    deno.mkdirSync(new URL("file:///test"));
    expect(core.toJSON()).toEqual({'/test': null});
  });

  test('throws if path is invalid', () => {
    const { deno } = setupDeno();
    expect(() => deno.mkdirSync("")).toThrow();
    expect(() => deno.mkdirSync("invalid//path")).toThrow();
    expect(() => deno.mkdirSync("invalid/...")).toThrow();
    expect(() => deno.mkdirSync("invalid/.../asdf")).toThrow();
    expect(() => deno.mkdirSync("invalid/\\/asdf")).toThrow();
  });
});