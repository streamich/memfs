# @jsonjoy.com/fs-core

Core filesystem primitives for building in-memory and virtual filesystems.

## Overview

This package provides the core data structures for representing a virtual filesystem:

- **Node** - Represents an i-node (index node), containing file data and metadata
- **Link** - Represents a hard link pointing to a Node
- **File** - Represents an open file descriptor
- **Superblock** - The root of a virtual filesystem, managing nodes and links

## Installation

```bash
npm install @jsonjoy.com/fs-core
```

## Usage

```typescript
import { Superblock, DirectoryJSON } from '@jsonjoy.com/fs-core';

// Create a new filesystem
const fs = new Superblock();

// Or create from a JSON structure
const json: DirectoryJSON = {
  '/file.txt': 'Hello, World!',
  '/dir/nested.txt': 'Nested content',
};
const fs = Superblock.fromJSON(json);
```
