import type { IPermissionStatus } from './types';

/**
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus
 */
export class CorePermissionStatus implements IPermissionStatus {
  public readonly name: string;
  public readonly state: 'granted' | 'denied' | 'prompt';

  constructor(state: 'granted' | 'denied' | 'prompt', name: string = '') {
    this.name = name;
    this.state = state;
  }
}
