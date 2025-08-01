# Missing File System API Interfaces

This document lists the File System API interfaces and methods that are part of the WHATWG File System API specification but are not yet implemented in memfs.

## Current Implementation Status

### ✅ Implemented Interfaces

- `IFileSystemHandle` (base interface)
- `IFileSystemDirectoryHandle`
- `IFileSystemFileHandle`
- `IFileSystemSyncAccessHandle`
- `IFileSystemWritableFileStream`
- `IPermissionStatus`

### ✅ Implemented Methods

- **FileSystemDirectoryHandle**: `keys()`, `entries()`, `values()`, `getDirectoryHandle()`, `getFileHandle()`, `removeEntry()`, `resolve()`
- **FileSystemFileHandle**: `getFile()`, `createWritable()`, `createSyncAccessHandle`
- **FileSystemHandle**: `isSameEntry()`, `queryPermission()`, `remove()` (stub), `requestPermission()` (stub)

## ❌ Missing APIs

### 1. Global Functions (Window Interface Extensions)

These functions should be available on the global `window` object:

```typescript
declare global {
  function showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  function showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  function showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}
```

### 2. Storage Manager Interface Extension (OPFS)

Extension to the `StorageManager` interface for Origin Private File System:

```typescript
interface StorageManager {
  getDirectory(): Promise<FileSystemDirectoryHandle>;
}
```

### 3. DataTransferItem Interface Extension

Extension for drag-and-drop file system access:

```typescript
interface DataTransferItem {
  getAsFileSystemHandle(): Promise<FileSystemHandle | null>;
}
```

### 4. Missing Type Definitions

#### OpenFilePickerOptions

```typescript
interface OpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
  startIn?: WellKnownDirectory | FileSystemHandle;
  id?: string;
}
```

#### SaveFilePickerOptions

```typescript
interface SaveFilePickerOptions {
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
  startIn?: WellKnownDirectory | FileSystemHandle;
  id?: string;
  suggestedName?: string;
}
```

#### DirectoryPickerOptions

```typescript
interface DirectoryPickerOptions {
  startIn?: WellKnownDirectory | FileSystemHandle;
  id?: string;
  mode?: 'read' | 'readwrite';
}
```

#### Supporting Types

```typescript
interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string | string[]>;
}

type WellKnownDirectory = 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';

type FileSystemHandleKind = 'file' | 'directory';
```

## Implementation Strategy

1. **Add missing type definitions** to `src/fsa/types.ts`
2. **Create global function stubs** in a new file `src/fsa/global.ts`
3. **Create interface extensions** for StorageManager and DataTransferItem
4. **Add stub implementations** that throw "not implemented" errors
5. **Update tests** to verify the stubs work correctly
6. **Update documentation** and exports

## Browser Support Notes

- Global picker functions require user activation (gesture) and HTTPS
- OPFS (StorageManager.getDirectory) is available in dedicated/shared workers
- DataTransferItem.getAsFileSystemHandle() is experimental and has limited support

## Reference

- [WHATWG File System API Specification](https://fs.spec.whatwg.org/)
- [MDN File System API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
