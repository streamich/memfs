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

  test.todo('can set mode');
  test.todo('throws if directory exists and recursive is false');
  test.todo('throws if parent directory does not exist and recursive is false');
  test.todo('throws if part of the path is a file');
  test.todo('accepts URL as path');
  test.todo('throws if path is invalid');
});