`casfs` is a Content Addressable Storage (CAS) abstraction over a file system.
It has no folders nor files. Instead, it has _blobs_ which are identified by their content.

Essentially, it provides two main operations: `put` and `get`. The `put` operation
takes a blob and stores it in the underlying file system and returns the blob's hash digest.
The `get` operation takes a hash and returns the blob, which matches the hash digest, if it exists.
