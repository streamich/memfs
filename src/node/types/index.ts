import type {FsCallbackApi} from "./callback";
import type {FsPromisesApi} from "./promises";
import type {FsSynchronousApi} from "./sync";

export interface FsApi extends FsCallbackApi, FsSynchronousApi {
  promises: FsPromisesApi;
}
