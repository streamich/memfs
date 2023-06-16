import type { FsSynchronousApi } from './sync';
import type { FsCallbackApi } from './callback';
import type { FsPromisesApi } from './promises';

export { FsSynchronousApi, FsCallbackApi, FsPromisesApi };

export interface FsApi extends FsCallbackApi, FsSynchronousApi {
  promises: FsPromisesApi;
}
