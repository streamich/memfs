export interface CrudApi {
  /**
   * Creates a new resource, or overwrites an existing one.
   * 
   * @param collection Type of the resource, collection name.
   * @param id Id of the resource, document name.
   * @param data Blob content of the resource.
   * @param options Write behavior options.
   */
  put: (collection: CrudCollection, id: string, data: Uint8Array, options: CrudPutOptions) => Promise<void>;

  /**
   * Retrieves the content of a resource.
   * 
   * @param collection Type of the resource, collection name.
   * @param id Id of the resource, document name.
   * @returns Blob content of the resource.
   */
  get: (collection: CrudCollection, id: string) => Promise<Uint8Array>;

  /**
   * Deletes a resource.
   * 
   * @param collection Type of the resource, collection name.
   * @param id Id of the resource, document name.
   * @param silent When true, does not throw an error if the collection or
   *               resource does not exist. Default is false.
   */
  del: (collection: CrudCollection, id: string, silent?: boolean) => Promise<void>;

  /**
   * Fetches information about a resource.
   * 
   * @param collection Type of the resource, collection name.
   * @param id Id of the resource, document name, if any.
   * @returns Information about the resource.
   */
  info: (collection: CrudCollection, id?: string) => Promise<CrudResourceInfo>;

  /**
   * Deletes all resources of a collection, and deletes recursively all sub-collections.
   * 
   * @param collection Type of the resource, collection name.
   */
  drop: (collection: CrudCollection) => Promise<void>;

  /**
   * Fetches a list of resources of a collection, and sub-collections.
   * 
   * @param collection Type of the resource, collection name.
   * @returns List of resources of the given type, and sub-types.
   */
  list: (collection: CrudCollection) => Promise<CrudTypeEntry[]>;

  /**
   * Recursively scans all resources of a collection, and sub-collections. Returns
   * a cursor to continue scanning.
   * 
   * @param collection Type of the resource, collection name.
   * @param cursor Cursor to start scanning from. If empty string, starts from the beginning.
   * @returns List of resources of the given type, and sub-collections. Also
   *          returns a cursor to continue scanning. If the cursor is empty
   *          string, the scan is complete.
   */
  scan: (collection: CrudCollection, cursor?: string | '') => Promise<CrudScanResult>;
}

export type CrudCollection = string[];

export interface CrudPutOptions {
  throwIf?: 'exists' | 'missing';
}

export interface CrudTypeEntry {
  /** Kind of the resource, type or item. */
  type: 'resource' | 'collection';
  /** Name of the resource. */
  id: string;
}

export interface CrudResourceInfo extends CrudTypeEntry {
  /** Size of the resource in bytes. */
  size?: number;
  /** Timestamp when the resource last modified. */
  modified?: number;
  /** Timestamp when the resource was created. */
  created?: number;
}

export interface CrudScanResult {
  cursor: string | '';
  list: CrudTypeEntry[];
}

export interface CrudScanEntry extends CrudTypeEntry {
  /** Collection, which contains this entry. */
  collection: CrudCollection;
}
