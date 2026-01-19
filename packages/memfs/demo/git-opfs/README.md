This demo showcase how to run Git in browser built-int OPFS file system. OPFS
stands for (Origin Private File System) it is a virtual file system available
in browser and it requires no permission to access.

In this demo we use `memfs` to create a Node `fs`-like file system in browser
out of OPFS. We then use `isomorphic-git` to run Git commands on that file system.

In the demo itself we initiate a Git repo, then we create a `README.md` file, we
stage it, and finally we commit it.

https://github.com/streamich/memfs/assets/9773803/bbc83f3f-98ad-48cc-9259-b6f543aa1a03

Run:

```
yarn demo:git-opfs
```

You can install [OPFS Explorer](https://chrome.google.com/webstore/detail/opfs-explorer/acndjpgkpaclldomagafnognkcgjignd) Chrome
extension to verify the contents of the OPFS file system.
