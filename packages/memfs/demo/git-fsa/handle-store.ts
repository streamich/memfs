const DATABASE_NAME = 'memfs-git-fsa';
const DATABASE_VERSION = 1;
const STORE_NAME = 'handles';
const ROOT_HANDLE_KEY = 'root';

const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = createRequest(transaction.objectStore(STORE_NAME));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
};

export const saveDirectoryHandle = async (handle: FileSystemDirectoryHandle): Promise<void> => {
  await runTransaction('readwrite', store => store.put(handle, ROOT_HANDLE_KEY));
};

export const loadDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | undefined> =>
  await runTransaction('readonly', store => store.get(ROOT_HANDLE_KEY));

export const clearDirectoryHandle = async (): Promise<void> => {
  await runTransaction('readwrite', store => store.delete(ROOT_HANDLE_KEY));
};
