# @jsonjoy.com/fs-node

In-memory filesystem with Node.js `fs`-compatible API.

## Installation

```bash
npm install @jsonjoy.com/fs-node
```

## Usage

```ts
import { Volume } from '@jsonjoy.com/fs-node';

const vol = new Volume();
vol.writeFileSync('/hello.txt', 'Hello, World!');
console.log(vol.readFileSync('/hello.txt', 'utf8')); // Hello, World!
```

### Create filesystem from JSON

```ts
import { Volume } from '@jsonjoy.com/fs-node';

const vol = Volume.fromJSON({
  '/app/index.js': 'console.log("Hello");',
  '/app/package.json': '{"name": "app"}',
});

console.log(vol.readdirSync('/app')); // ['index.js', 'package.json']
```

## API

The `Volume` class implements Node.js `fs` module's synchronous and callback APIs:

- `readFile`, `readFileSync`
- `writeFile`, `writeFileSync`
- `mkdir`, `mkdirSync`
- `readdir`, `readdirSync`
- `stat`, `statSync`
- `unlink`, `unlinkSync`
- ... and many more

It also exposes a `promises` property for the Promise-based API:

```ts
const data = await vol.promises.readFile('/hello.txt', 'utf8');
```

## License

Apache-2.0
