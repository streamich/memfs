# `isomorphic-git` running on `memfs` in-memory file system

This demo shows how to run `isomorphic-git` on `memfs` in-memory file system. It
creates a new folder `/repo`, then inits a Git repository there, then creates a
a file `/repo/README.md` and commits it.

![](https://github.com/streamich/memfs/assets/9773803/021af8ea-690d-4e4e-9d05-d3e0dea60672)

Run:

```
yarn
npx ts-node demo/git/index.ts
```

The demo will print the snapshot of the file system after each step.
