/**
 * @see [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/PermissionStatus)
 */
export class NodePermissionStatus {
  constructor(
    public readonly name: string,
    public readonly state: 'granted' | 'denied' | 'prompt',
  ) {}
}
