import {setupDeno} from "./fixtures";

describe('mkdir', () => {
  test('can create a directory at root', async () => {
    const { deno, core } = setupDeno();
    expect(core.toJSON()).toEqual({});
    await deno.mkdir("/test");
    expect(core.toJSON()).toEqual({'/test': null});
  });

  test('can create a deeply nested directory', async () => {
    const { deno, core } = setupDeno();
    expect(core.toJSON()).toEqual({});
    await deno.mkdir("/test/nested", {recursive: true});
    expect(core.toJSON()).toEqual({'/test/nested': null});
  });

  test('can set mode', async () => {
    const { deno, core } = setupDeno();
    await deno.mkdir("/test", {mode: 0o755});
    const stats = core.stat("/test");
    expect(stats.mode & 0o777).toBe(0o755);
    await deno.mkdir("/test2", {mode: 0o777});
    const stats2 = core.stat("/test2");
    expect(stats2.mode & 0o777).toBe(0o777);
  });

  test('throws if directory exists and recursive is false', async () => {
    const { deno } = setupDeno({
      '/test': null
    });
    await expect(deno.mkdir("/test")).rejects.toThrow();
    await expect(deno.mkdir("/test", {recursive: false})).rejects.toThrow();
    await deno.mkdir("/test", {recursive: true});
  });

  test('throws if parent directory does not exist and recursive is false', async () => {
    const { deno } = setupDeno();
    await expect(deno.mkdir("/test/nested")).rejects.toThrow();
    await expect(deno.mkdir("/test/nested", {recursive: false})).rejects.toThrow();
    await deno.mkdir("/test/nested", {recursive: true});
  });

  test('throws if part of the path is a file', async () => {
    const { deno } = setupDeno({
      '/file.txt': 'content'
    });
    await expect(deno.mkdir("/file.txt/nested", {recursive: true})).rejects.toThrow();
  });

  test('accepts URL as path', async () => {
    const { deno, core } = setupDeno();
    await deno.mkdir(new URL("file:///test"));
    expect(core.toJSON()).toEqual({'/test': null});
  });

  test('throws if path is invalid', async () => {
    const { deno } = setupDeno();
    await expect(deno.mkdir("")).rejects.toThrow();
    await expect(deno.mkdir("invalid//path")).rejects.toThrow();
    await expect(deno.mkdir("invalid/...")).rejects.toThrow();
    await expect(deno.mkdir("invalid/.../asdf")).rejects.toThrow();
    await expect(deno.mkdir("invalid/\\/asdf")).rejects.toThrow();
  });
});