import type {
  OpenFilePickerOptions,
  SaveFilePickerOptions,
  DirectoryPickerOptions,
  IFileSystemFileHandle,
  IFileSystemDirectoryHandle,
} from './types';

/**
 * Global File System API functions that should be available on the window object.
 * These are stub implementations that throw "not implemented" errors.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
 */

/**
 * Shows a file picker that allows the user to select one or more files.
 * Requires user activation (user gesture) and secure context (HTTPS).
 *
 * @param options Configuration options for the file picker
 * @returns Promise that resolves to an array of selected file handles
 * @throws Error with message "not implemented"
 */
export function showOpenFilePicker(options?: OpenFilePickerOptions): Promise<IFileSystemFileHandle[]> {
  return Promise.reject(new Error('not implemented'));
}

/**
 * Shows a file picker that allows the user to save a file.
 * Requires user activation (user gesture) and secure context (HTTPS).
 *
 * @param options Configuration options for the file picker
 * @returns Promise that resolves to a file handle for saving
 * @throws Error with message "not implemented"
 */
export function showSaveFilePicker(options?: SaveFilePickerOptions): Promise<IFileSystemFileHandle> {
  return Promise.reject(new Error('not implemented'));
}

/**
 * Shows a directory picker that allows the user to select a directory.
 * Requires user activation (user gesture) and secure context (HTTPS).
 *
 * @param options Configuration options for the directory picker
 * @returns Promise that resolves to a directory handle
 * @throws Error with message "not implemented"
 */
export function showDirectoryPicker(options?: DirectoryPickerOptions): Promise<IFileSystemDirectoryHandle> {
  return Promise.reject(new Error('not implemented'));
}

/**
 * Install global File System API functions on the window object.
 * This allows the stubs to be used in browser environments for testing.
 *
 * @example
 * ```typescript
 * import { installGlobalFSAStubs } from './fsa/global';
 * installGlobalFSAStubs();
 *
 * // Now you can use the global functions (they will throw "not implemented")
 * try {
 *   await showDirectoryPicker();
 * } catch (error) {
 *   console.log(error.message); // "not implemented"
 * }
 * ```
 */
export function installGlobalFSAStubs(): void {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).showOpenFilePicker = showOpenFilePicker;
    (globalThis as any).showSaveFilePicker = showSaveFilePicker;
    (globalThis as any).showDirectoryPicker = showDirectoryPicker;
  }
}
