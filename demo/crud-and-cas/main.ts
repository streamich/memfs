import { FsaCrud } from '../../src/fsa-to-crud';
import { CrudCas } from '../../src/crud-to-cas';
import type * as fsa from '../../src/fsa/types';

const hash = async (data: Uint8Array): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const demo = async (dir: fsa.IFileSystemDirectoryHandle) => {
  try {
    const crud = new FsaCrud(dir);
    const cas = new CrudCas(await crud.from(['objects']), { hash });

    // Store "Hello, world!" in object storage
    const cid = await cas.put(new TextEncoder().encode('Hello, world!'));

    // Store the CID in the refs/heads/main.txt file
    await crud.put(['refs', 'heads'], 'main.txt', new TextEncoder().encode(cid));
  } catch (error) {
    console.log(error);
    console.log((<any>error).name);
  }
};

const main = async () => {
  const button = document.createElement('button');
  button.textContent = 'Select an empty folder';
  document.body.appendChild(button);
  button.onclick = async () => {
    const dir = await (window as any).showDirectoryPicker({ id: 'demo', mode: 'readwrite' });
    await demo(dir);
  };
};

main();
