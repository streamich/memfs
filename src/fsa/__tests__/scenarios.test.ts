import { Superblock } from '../../core/Superblock';
import { coreToFsa, fsa } from '../index';
import { CoreFileSystemDirectoryHandle } from '../CoreFileSystemDirectoryHandle';
import { onlyOnNode20 } from '../../__tests__/util';
import { fileURLToPath } from 'url';

onlyOnNode20('coreToFsa scenarios', () => {
  test('can create FSA from empty Superblock', () => {
    const core = new Superblock();
    const fsa = coreToFsa(core);
    expect(fsa).toBeInstanceOf(CoreFileSystemDirectoryHandle);
    expect(fsa.name).toBe('');
  });

  test('can create FSA from Superblock with data', () => {
    const core = Superblock.fromJSON({
      'documents/readme.txt': 'Welcome!',
      'photos/vacation.jpg': Buffer.from('fake-jpg-data'),
      'empty-folder': null,
    });
    const fsa = coreToFsa(core, '/', { mode: 'readwrite' });
    expect(fsa).toBeInstanceOf(CoreFileSystemDirectoryHandle);
  });

  test('can create FSA using fsa() helper', async () => {
    const { dir, core } = fsa({ mode: 'readwrite' });
    core.fromJSON(
      {
        'documents/readme.txt': 'Welcome!',
        'photos/vacation.jpg': Buffer.from('fake-jpg-data'),
        'empty-folder': null,
      },
      '/',
    );
    expect(dir).toBeInstanceOf(CoreFileSystemDirectoryHandle);
    expect(dir.name).toBe('');
    const dir2 = await dir.getDirectoryHandle('documents');
    const file = await dir2.getFileHandle('readme.txt');
    const fileContent = await file.getFile();
    expect(await fileContent.text()).toBe('Welcome!');
  });

  test('can create a a file folder in empty filesystem', async () => {
    const { dir, core } = fsa({ mode: 'readwrite' });
    expect(core.toJSON()).toEqual({});
    const dir2 = await dir.getDirectoryHandle('new-folder', { create: true });
    expect(core.toJSON()).toEqual({
      '/new-folder': null,
    });
    const file = await dir2.getFileHandle('file.txt', { create: true });
    expect(core.toJSON()).toEqual({
      '/new-folder/file.txt': '',
    });
    await (await file.createWritable()).write('Hello, world!');
    expect(core.toJSON()).toEqual({
      '/new-folder/file.txt': 'Hello, world!',
    });
  });

  test('can navigate filesystem structure', async () => {
    const core = Superblock.fromJSON(
      {
        'documents/readme.txt': 'Welcome to the document folder!',
        'documents/notes/personal.txt': 'Personal notes here',
        photos: null,
      },
      '/',
    );

    const rootFsa = coreToFsa(core, '/', { mode: 'readwrite' });

    // Check root contents
    const rootEntries: string[] = [];
    for await (const key of rootFsa.keys()) {
      rootEntries.push(key);
    }
    expect(rootEntries.sort()).toEqual(['documents', 'photos']);

    // Navigate to documents
    const documentsHandle = await rootFsa.getDirectoryHandle('documents');
    expect(documentsHandle.name).toBe('documents');

    // Check documents contents
    const docEntries: string[] = [];
    for await (const key of documentsHandle.keys()) {
      docEntries.push(key);
    }
    expect(docEntries.sort()).toEqual(['notes', 'readme.txt']);

    // Read readme file
    const readmeHandle = await documentsHandle.getFileHandle('readme.txt');
    const readmeFile = await readmeHandle.getFile();
    expect(await readmeFile.text()).toBe('Welcome to the document folder!');

    // Navigate deeper
    const notesHandle = await documentsHandle.getDirectoryHandle('notes');
    const personalHandle = await notesHandle.getFileHandle('personal.txt');
    const personalFile = await personalHandle.getFile();
    expect(await personalFile.text()).toBe('Personal notes here');
  });

  test('can create and modify files', async () => {
    const core = new Superblock();
    const fsa = coreToFsa(core, '/', { mode: 'readwrite' });

    // Create a new file
    const fileHandle = await fsa.getFileHandle('newfile.txt', { create: true });
    expect(fileHandle.name).toBe('newfile.txt');

    // Write to the file
    const writable = await fileHandle.createWritable();
    await writable.write('Hello from core FSA!');
    await writable.close();

    // Read back the content
    const file = await fileHandle.getFile();
    expect(await file.text()).toBe('Hello from core FSA!');

    // Verify it's in the directory listing
    const entries: string[] = [];
    for await (const key of fsa.keys()) {
      entries.push(key);
    }
    expect(entries).toContain('newfile.txt');
  });

  test('can create directory structure', async () => {
    const core = new Superblock();
    const fsa = coreToFsa(core, '/', { mode: 'readwrite' });

    // Create nested directories
    const projectsHandle = await fsa.getDirectoryHandle('projects', { create: true });
    const webHandle = await projectsHandle.getDirectoryHandle('web-app', { create: true });
    const srcHandle = await webHandle.getDirectoryHandle('src', { create: true });

    // Create a file in the nested structure
    const indexHandle = await srcHandle.getFileHandle('index.js', { create: true });
    const writable = await indexHandle.createWritable();
    await writable.write('console.log("Hello from nested structure!");');
    await writable.close();

    // Verify the structure was created
    expect(projectsHandle.name).toBe('projects');
    expect(webHandle.name).toBe('web-app');
    expect(srcHandle.name).toBe('src');

    // Verify we can read the file
    const file = await indexHandle.getFile();
    expect(await file.text()).toBe('console.log("Hello from nested structure!");');

    // Test resolve functionality
    const resolved = await fsa.resolve(indexHandle);
    expect(resolved).toEqual(['projects', 'web-app', 'src', 'index.js']);
  });

  test('can remove files and directories', async () => {
    const core = Superblock.fromJSON(
      {
        'temp/file1.txt': 'temporary file 1',
        'temp/file2.txt': 'temporary file 2',
        'temp/subfolder/file3.txt': 'temporary file 3',
        'keep.txt': 'this should remain',
      },
      '/',
    );

    const fsa = coreToFsa(core, '/', { mode: 'readwrite' });

    // Remove a single file - correct the filename
    await fsa.removeEntry('keep.txt');
    await expect(fsa.getFileHandle('keep.txt')).rejects.toThrow('A requested file or directory could not be found');

    // Remove directory recursively
    await fsa.removeEntry('temp', { recursive: true });
    await expect(fsa.getDirectoryHandle('temp')).rejects.toThrow('A requested file or directory could not be found');

    // Verify root is now empty
    const entries: string[] = [];
    for await (const key of fsa.keys()) {
      entries.push(key);
    }
    expect(entries).toEqual([]);
  });

  test('read-only mode restrictions', async () => {
    const core = Superblock.fromJSON(
      {
        'readonly.txt': 'This file is read-only',
      },
      '/',
    );

    const fsa = coreToFsa(core, '/', { mode: 'read' });

    // Can read existing files
    const fileHandle = await fsa.getFileHandle('readonly.txt');
    const file = await fileHandle.getFile();
    expect(await file.text()).toBe('This file is read-only');

    // Cannot create new files
    await expect(fsa.getFileHandle('newfile.txt', { create: true })).rejects.toThrow('The request is not allowed');

    // Cannot create directories
    await expect(fsa.getDirectoryHandle('newfolder', { create: true })).rejects.toThrow('The request is not allowed');

    // Cannot create writable streams
    await expect(fileHandle.createWritable()).rejects.toThrow('The request is not allowed');

    // Cannot remove entries
    await expect(fsa.removeEntry('readonly.txt')).rejects.toThrow('The request is not allowed');
  });
});
