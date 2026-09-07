export interface SystemErrorContext {
  code: string;
  message: string;
  path?: string;
  dest?: string;
  syscall: string;
  errno: number;
}

/** Node's `internal/errors` `SystemError`: an `ERR_*` code wrapping a libuv result. */
export class SystemError extends Error {
  public code: string;
  public info: SystemErrorContext;
  public errno: number;
  public syscall: string;
  declare public path?: string;
  declare public dest?: string;

  constructor(code: string, prefix: string, info: SystemErrorContext) {
    const path = info.path;
    const dest = info.dest;
    let message = prefix + ': ' + info.syscall + ' returned ' + info.code + ' (' + info.message + ')';
    if (path !== undefined) message += ' ' + path;
    if (dest !== undefined) message += ' => ' + dest;
    super(message);
    this.code = code;
    this.info = info;
    this.errno = info.errno;
    this.syscall = info.syscall;
    if (path !== undefined) this.path = path;
    if (dest !== undefined) this.dest = dest;
  }

  public toString(): string {
    return this.name + ' [' + this.code + ']: ' + this.message;
  }
}

SystemError.prototype.name = 'SystemError';
