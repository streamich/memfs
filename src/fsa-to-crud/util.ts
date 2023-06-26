import type * as crud from '../crud/types';

export const newFile404Error = (collection: crud.CrudCollection, id: string) =>
  new DOMException(`Resource "${id}" in /${collection.join('/')} not found`, 'ResourceNotFound');

export const newFolder404Error = (collection: crud.CrudCollection) =>
  new DOMException(`Collection /${collection.join('/')} does not exist`, 'CollectionNotFound');

export const newExistsError = () => new DOMException('Resource already exists', 'Exists');

export const newMissingError = () => new DOMException('Resource is missing', 'Missing');
