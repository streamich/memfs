import type { FsSynchronousApi } from './FsSynchronousApi';
import type { FsCallbackApi } from './FsCallbackApi';
import type { FsPromisesApi } from './FsPromisesApi';

export type * from './misc';
export { FsSynchronousApi, FsCallbackApi, FsPromisesApi };

export interface FsApi extends FsCallbackApi, FsSynchronousApi {
  promises: FsPromisesApi;
}
