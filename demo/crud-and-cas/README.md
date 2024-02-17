This demo showcases `crudfs` and `casfs` interoperability in browser and Node.js.

First, in browser an object is stored into `casfs` (Content Addressable Storage)
and its hash (CID) is persisted using `crudfs`, in a real user folder.

Then, from Node.js, the CID is retrieved using `crudfs` and the object is read
using `casfs`.

https://github.com/streamich/memfs/assets/9773803/02ba339c-6e13-4712-a02f-672674300d27

Run:

```
yarn demo:git-fsa
```
