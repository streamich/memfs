# Workspace

Yarn workspaces monorepo with packages:

## Packages

- **memfs** - In-memory file system with Node.js `fs` API
- **node-fs-dependencies** - Node.js standard library polyfills (fs, events, stream)
- **node-fs-utils** - Utility types and helpers for `fs` operations

## Common Commands

```bash
# Install dependencies
yarn

# Clean all packages
yarn clean

# Build all packages
yarn build

# Run tests in all packages
yarn test

# Run typecheck in all packages
yarn typecheck

# Check formatting in all packages
yarn prettier:check

# Fix formatting in all packages
yarn prettier
```

## Releasing

See [scripts/RELEASE.md](scripts/RELEASE.md)
