import { defineConfig, Options } from 'tsup';

var commonOptions: Options = {
  sourcemap: false,
  clean: true,
  format: ['cjs', 'esm'],
  bundle: false,
  dts: true,
  outDir: 'lib',
};

export default defineConfig([
  {
    ...commonOptions,
    entry: [
      'src/constants.ts',
      'src/Dirent.ts',
      'src/encoding.ts',
      'src/getBigInt.ts',
      'src/node.ts',
      'src/process.ts',
      'src/promises.ts',
      'src/setImmediate.ts',
      'src/setTimeoutUnref.ts',
      'src/Stats.ts',
      'src/volume.ts',
      'src/volume-localstorage.ts',
      'src/internal/*.ts',
    ],
  },
  {
    ...commonOptions,
    entry: ['src/index.ts'],
    format: ['cjs'],
  },
  {
    ...commonOptions,
    entry: { index: 'src/index-esm.ts' },
    format: ['esm'],
    outExtension: () => {
      return { js: '.mjs' };
    },
  },
]);
