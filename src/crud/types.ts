export interface CrudApi {
  /**
   * Creates a new resource, or overwrites an existing one.
   * 
   * @param type Type of the resource, collection name.
   * @param id Id of the resource, document name.
   * @param data Blob content of the resource.
   * @param options Write behavior options.
   */
  put: (type: CrudType, id: string, data: Uint8Array, options: CrudPutOptions) => Promise<void>;

  /**
   * Retrieves the content of a resource.
   * 
   * @param type Type of the resource, collection name.
   * @param id Id of the resource, document name.
   * @returns Blob content of the resource.
   */
  get: (type: CrudType, id: string) => Promise<Uint8Array>;

  /**
   * Deletes a resource.
   * 
   * @param type Type of the resource, collection name.
   * @param id Id of the resource, document name.
   */
  del: (type: CrudType, id: string) => Promise<void>;

  /**
   * Fetches information about a resource.
   * 
   * @param type Type of the resource, collection name.
   * @param id Id of the resource, document name, if any.
   * @returns Information about the resource.
   */
  info: (type: CrudType, id?: string) => Promise<CrudResourceInfo>;

  /**
   * Deletes all resources of a type, and deletes recursively all sub-collections.
   * 
   * @param type Type of the resource, collection name.
   */
  drop: (type: CrudType) => Promise<void>;

  /**
   * Fetches a list of resources of a type, and sub-collections.
   * 
   * @param type Type of the resource, collection name.
   * @returns List of resources of the given type, and sub-collections.
   */
  list: (type: CrudType) => Promise<CrudTypeEntry[]>;

  /**
   * Recursively scans all resources of a type, and sub-collections. Returns
   * a cursor to continue scanning.
   * 
   * @param type Type of the resource, collection name.
   * @param cursor Cursor to start scanning from. If empty string, starts from the beginning.
   * @returns List of resources of the given type, and sub-collections. Also
   *          returns a cursor to continue scanning. If the cursor is empty
   *          string, the scan is complete.
   */
  scan: (type: CrudType, cursor?: string | '') => Promise<CrudScanResult>;
}

export type CrudType = string[];

export interface CrudPutOptions {
  throwIf?: 'exists' | 'missing';
}

export interface CrudTypeEntry {
  /** Kind of the resource, type or item. */
  kind: 'type' | 'item';
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
