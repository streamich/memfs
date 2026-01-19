import type { NodeFsaContext } from './types';
import { FileLockManager } from '@jsonjoy.com/fs-fsa';

export { basename } from '@jsonjoy.com/fs-node-utils';

/**
 * Creates a new {@link NodeFsaContext}.
 */
export const ctx = (partial: Partial<NodeFsaContext> = {}): NodeFsaContext => {
  return {
    separator: '/',
    syncHandleAllowed: false,
    mode: 'read',
    locks: new FileLockManager(),
    ...partial,
  };
};

const nameRegex = /^(\.{1,2})$|^(.*([\/\\]).*)$/;

export const assertName = (name: string, method: string, klass: string) => {
  const isInvalid = !name || nameRegex.test(name);
  if (isInvalid) throw new TypeError(`Failed to execute '${method}' on '${klass}': Name is not allowed.`);
};

export const assertCanWrite = (mode: 'read' | 'readwrite') => {
  if (mode !== 'readwrite')
    throw new DOMException(
      'The request is not allowed by the user agent or the platform in the current context.',
      'NotAllowedError',
    );
};

export const newNotFoundError = () =>
  new DOMException(
    'A requested file or directory could not be found at the time an operation was processed.',
    'NotFoundError',
  );

export const newTypeMismatchError = () =>
  new DOMException('The path supplied exists, but was not an entry of requested type.', 'TypeMismatchError');

export const newNotAllowedError = () => new DOMException('Permission not granted.', 'NotAllowedError');

export const newNoModificationAllowedError = () =>
  new DOMException('The file is locked and cannot be modified.', 'NoModificationAllowedError');
