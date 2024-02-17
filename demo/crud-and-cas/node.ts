// Run: npx ts-node demo/crud-and-cas/node.ts

import { NodeCrud } from '../../src/node-to-crud';
import { CrudCas } from '../../src/crud-to-cas';
import * as fs from 'fs';
const root = require('app-root-path');
const path = require('path');

const hash = async (data: Uint8Array): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

const main = async () => {
  const dir = path.resolve(root.path, 'fs-test');
  const crud = new NodeCrud({ fs: <any>fs.promises, dir });
  const cas = new CrudCas(await crud.from(['objects']), { hash });

  // Retrieve the CID from the refs/heads/main.txt file
  const cid = await crud.get(['refs', 'heads'], 'main.txt');
  const cidText = Buffer.from(cid).toString();
  console.log('CID:', cidText);

  // Retrieve the data from the object storage
  const data = await cas.get(cidText);
  const dataText = Buffer.from(data).toString();
  console.log('Content:', dataText);
};

main();
