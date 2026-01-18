This demo showcase how to run Git in browser but write to a real user file system
folder. It is possible through File System Access API. The API allows to request
a folder from user and then use it as a real file system in browser.

In this demo we use `memfs` to create a Node `fs`-like file system in browser
out of the folder provided by File System Access API. We then use `isomorphic-git`
to run Git commands on that file system.

In the demo itself we initiate a Git repo, then we create a `README.md` file, we
stage it, and finally we commit it.

https://github.com/streamich/memfs/assets/9773803/c15212e8-3ee2-4d2a-b325-9fbdcc377c12

Run:

```
yarn demo:git-fsa
```
