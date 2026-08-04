(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer').Buffer;

import { FsaNodeFs } from '../../src/fsa-to-node';
import type { IFileSystemDirectoryHandle } from '../../src/fsa';
import git from 'isomorphic-git';
import { clearDirectoryHandle, loadDirectoryHandle, saveDirectoryHandle } from './handle-store';

const REPO_DIR = '/repo';
const PERMISSION = { mode: 'readwrite' } as const;

type BrowserDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission(descriptor: typeof PERMISSION): Promise<PermissionState>;
  requestPermission(descriptor: typeof PERMISSION): Promise<PermissionState>;
};

type DemoWindow = Window & {
  fs?: FsaNodeFs;
  showDirectoryPicker?: (options: { id: string; mode: 'readwrite' }) => Promise<BrowserDirectoryHandle>;
};

const demoWindow = window as DemoWindow;

const isMissing = (error: unknown): boolean =>
  !!error &&
  typeof error === 'object' &&
  ('code' in error ? error.code === 'ENOENT' : 'name' in error && error.name === 'NotFoundError');

const hasRepository = async (fs: FsaNodeFs): Promise<boolean> => {
  try {
    return (await fs.promises.stat(`${REPO_DIR}/.git`)).isDirectory();
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
};

const createRepository = async (fs: FsaNodeFs): Promise<void> => {
  console.log(`Create "${REPO_DIR}" folder`);
  await fs.promises.mkdir(REPO_DIR, { recursive: true });

  console.log('Init git repo');
  await git.init({ fs, dir: REPO_DIR });

  console.log('Create README file');
  await fs.promises.writeFile(`${REPO_DIR}/README.md`, 'Hello World\n');

  console.log('Stage README file');
  await git.add({ fs, dir: REPO_DIR, filepath: 'README.md' });

  console.log('Commit README file');
  await git.commit({
    fs,
    dir: REPO_DIR,
    author: { name: 'Git', email: 'leonid@kingdom.com' },
    message: 'fea: initial commit',
  });
};

const openDirectory = async (handle: BrowserDirectoryHandle): Promise<'created' | 'reopened'> => {
  const root = handle as unknown as IFileSystemDirectoryHandle;
  const fs = (demoWindow.fs = new FsaNodeFs(root));
  if (!(await hasRepository(fs))) {
    await createRepository(fs);
    return 'created';
  }
  const [latestCommit] = await git.log({ fs, dir: REPO_DIR, depth: 1 });
  console.log(`Reopened "${handle.name}" at commit ${latestCommit.oid}`);
  return 'reopened';
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const isAbort = (error: unknown): boolean =>
  !!error && typeof error === 'object' && 'name' in error && error.name === 'AbortError';

const main = async (): Promise<void> => {
  const heading = document.createElement('h1');
  heading.textContent = 'Git in a real folder';
  const status = document.createElement('p');
  const selectButton = document.createElement('button');
  selectButton.textContent = 'Select an empty folder';
  const reconnectButton = document.createElement('button');
  reconnectButton.textContent = 'Reconnect saved folder';
  reconnectButton.hidden = true;
  const forgetButton = document.createElement('button');
  forgetButton.textContent = 'Forget saved folder';
  forgetButton.hidden = true;
  document.body.append(heading, status, selectButton, reconnectButton, forgetButton);

  let savedHandle: BrowserDirectoryHandle | undefined;

  const setBusy = (busy: boolean): void => {
    selectButton.disabled = busy;
    reconnectButton.disabled = busy;
    forgetButton.disabled = busy;
  };

  const showOpened = (handle: BrowserDirectoryHandle, result: 'created' | 'reopened'): void => {
    status.textContent =
      result === 'created'
        ? `Created the demo repository in "${handle.name}".`
        : `Reopened the demo repository in "${handle.name}".`;
    reconnectButton.hidden = true;
    forgetButton.hidden = false;
  };

  const activate = async (handle: BrowserDirectoryHandle): Promise<void> => {
    showOpened(handle, await openDirectory(handle));
  };

  selectButton.onclick = async () => {
    if (!demoWindow.showDirectoryPicker) return;
    setBusy(true);
    try {
      const handle = await demoWindow.showDirectoryPicker({ id: 'git-fsa-demo', mode: 'readwrite' });
      await activate(handle);
      await saveDirectoryHandle(handle);
      savedHandle = handle;
    } catch (error) {
      if (!isAbort(error)) status.textContent = `Could not open the folder: ${errorMessage(error)}`;
    } finally {
      setBusy(false);
    }
  };

  reconnectButton.onclick = async () => {
    if (!savedHandle) return;
    setBusy(true);
    try {
      if ((await savedHandle.requestPermission(PERMISSION)) === 'granted') await activate(savedHandle);
      else status.textContent = `Permission was not granted for "${savedHandle.name}".`;
    } catch (error) {
      status.textContent = `Could not reconnect the folder: ${errorMessage(error)}`;
    } finally {
      setBusy(false);
    }
  };

  forgetButton.onclick = async () => {
    setBusy(true);
    try {
      await clearDirectoryHandle();
      savedHandle = undefined;
      delete demoWindow.fs;
      status.textContent = 'Forgot the saved folder.';
      reconnectButton.hidden = true;
      forgetButton.hidden = true;
    } catch (error) {
      status.textContent = `Could not forget the folder: ${errorMessage(error)}`;
    } finally {
      setBusy(false);
    }
  };

  if (!demoWindow.showDirectoryPicker) {
    selectButton.disabled = true;
    status.textContent = 'This browser does not support the File System Access API.';
    return;
  }

  try {
    savedHandle = (await loadDirectoryHandle()) as BrowserDirectoryHandle | undefined;
    if (!savedHandle) {
      status.textContent = 'Select an empty folder to create the demo repository.';
      return;
    }
    forgetButton.hidden = false;
    if ((await savedHandle.queryPermission(PERMISSION)) === 'granted') {
      setBusy(true);
      try {
        await activate(savedHandle);
      } finally {
        setBusy(false);
      }
    } else {
      status.textContent = `Reconnect "${savedHandle.name}" to continue.`;
      reconnectButton.hidden = false;
    }
  } catch (error) {
    status.textContent = `Could not restore the saved folder: ${errorMessage(error)}`;
    reconnectButton.hidden = !savedHandle;
  }
};

main();
