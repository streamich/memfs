# Git in a real browser folder

This demo shows how to run Git in a browser while writing to a real folder on
the user's device. It uses the File System Access API to select a folder,
`memfs` to expose that folder through a Node.js `fs`-like API, and
`isomorphic-git` to run Git commands.

The first time a folder is selected, the demo creates a repository in its
`repo` subdirectory, writes and stages a `README.md`, and creates an initial
commit. The selected directory handle is saved in IndexedDB. On later visits,
the demo reopens the repository or asks the user to restore permission with a
button click.

https://github.com/streamich/memfs/assets/9773803/c15212e8-3ee2-4d2a-b325-9fbdcc377c12

## Run

From the repository root:

```
yarn build
yarn workspace memfs demo:git-fsa
```

Open `http://localhost:9876` in Chrome or Edge. Browsers treat localhost as a
secure context for the File System Access API.

## Manual test

1. Select a new empty folder and confirm that it receives `repo/README.md` and
   a `repo/.git` directory.
2. Reload the page. If the browser asks for permission again, click
   **Reconnect saved folder** and grant read/write access.
3. Confirm that the page reports that it reopened the repository and that no
   second repository or initial commit is created.
4. Deny a reconnect request and confirm that the page reports the denial
   without changing the folder.
5. Click **Forget saved folder**, reload, and confirm that the page asks for a
   new folder.
