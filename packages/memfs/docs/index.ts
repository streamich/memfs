import type { LibPage } from './types';

export const page: LibPage = {
  name: 'memfs',
  title: 'memfs',
  type: 'lib',
  subtitle: 'In-memory Node.js fs API and browser File System Access API.',
  pkg: 'memfs',
  group: 'tooling',
  repo: 'streamich/memfs',
  repoPath: 'tree/master/packages/memfs',
  tech: 'TypeScript',
  techIcon: { set: 'lineicons', icon: 'typescript' },
  showContentsTable: true,
  children: [
    {
      name: 'Node fs API',
      subtitle: 'The in-memory fs module: fs, vol, Volume, memfs(), and the supported method surface.',
      // @ts-ignore
      src: async () => (await import('./node.md')).default,
    },
    {
      name: 'Volumes',
      subtitle: 'Create volumes from JSON, export them back, and combine memfs with unionfs and fs-monkey.',
      // @ts-ignore
      src: async () => (await import('./volumes.md')).default,
    },
    {
      name: 'File System Access',
      subtitle: 'An in-memory implementation of the browser File System (Access) (FSA) API.',
      // @ts-ignore
      src: async () => (await import('./fsa.md')).default,
    },
    {
      name: 'Adapters',
      subtitle: 'Bridge between the Node fs API and the FSA API in either direction, including a sync bridge.',
      // @ts-ignore
      src: async () => (await import('./adapters.md')).default,
    },
    {
      name: 'Snapshots',
      subtitle: 'POJO, CBOR, and JSON snapshots of any fs directory, preserving symlinks and binary data.',
      // @ts-ignore
      src: async () => (await import('./snapshot.md')).default,
    },
    {
      name: 'Tree printing',
      subtitle: 'Render an ASCII tree of any fs directory.',
      // @ts-ignore
      src: async () => (await import('./print.md')).default,
    },
  ],
  // @ts-ignore
  src: async () => (await import('./text.md')).default,
};
