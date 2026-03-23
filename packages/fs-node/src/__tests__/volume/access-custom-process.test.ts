import { Volume } from '../..';
import type { IProcess } from '@jsonjoy.com/fs-core/lib/process';
import { AMODE } from '@jsonjoy.com/fs-node-utils';

const makeProcess = (uid: number, gid: number): IProcess => ({
  getuid: () => uid,
  getgid: () => gid,
  cwd: () => '/',
  platform: 'linux',
  emitWarning: () => {},
  env: {},
});

describe('accessSync with custom process', () => {
  it('respects custom uid/gid for X_OK check (issue reproduction)', () => {
    const vol = Volume.fromJSON({ '/exec.sh': '#!/bin/sh' }, '/', { process: makeProcess(1000, 1000) });
    vol.chmodSync('/exec.sh', 0o100); // user-execute only
    vol.chownSync('/exec.sh', 1000, 1000);
    // uid 1000 owns the file and has execute permission - should not throw
    expect(() => vol.accessSync('/exec.sh', AMODE.X_OK)).not.toThrow();
  });

  it('throws EACCES for X_OK when custom uid has no execute permission', () => {
    const vol = Volume.fromJSON({ '/exec.sh': '#!/bin/sh' }, '/', { process: makeProcess(1000, 1000) });
    vol.chmodSync('/exec.sh', 0o100); // user-execute only
    vol.chownSync('/exec.sh', 0, 0); // owned by root
    // uid 1000 does not own the file and has no execute permission
    expect(() => vol.accessSync('/exec.sh', AMODE.X_OK)).toThrow(expect.objectContaining({ code: 'EACCES' }));
  });

  it('respects custom uid/gid for R_OK check', () => {
    const vol = Volume.fromJSON({ '/file.txt': 'data' }, '/', { process: makeProcess(1000, 1000) });
    vol.chmodSync('/file.txt', 0o400); // owner read-only
    vol.chownSync('/file.txt', 1000, 1000);
    expect(() => vol.accessSync('/file.txt', AMODE.R_OK)).not.toThrow();
  });

  it('throws EACCES for R_OK when custom uid has no read permission', () => {
    const vol = Volume.fromJSON({ '/file.txt': 'data' }, '/', { process: makeProcess(1000, 1000) });
    vol.chmodSync('/file.txt', 0o400); // owner read-only
    vol.chownSync('/file.txt', 0, 0); // owned by root
    expect(() => vol.accessSync('/file.txt', AMODE.R_OK)).toThrow(expect.objectContaining({ code: 'EACCES' }));
  });

  it('respects custom uid/gid for W_OK check', () => {
    const vol = Volume.fromJSON({ '/file.txt': 'data' }, '/', { process: makeProcess(1000, 1000) });
    vol.chmodSync('/file.txt', 0o200); // owner write-only
    vol.chownSync('/file.txt', 1000, 1000);
    expect(() => vol.accessSync('/file.txt', AMODE.W_OK)).not.toThrow();
  });

  it('throws EACCES for W_OK when custom uid has no write permission', () => {
    const vol = Volume.fromJSON({ '/file.txt': 'data' }, '/', { process: makeProcess(1000, 1000) });
    vol.chmodSync('/file.txt', 0o200); // owner write-only
    vol.chownSync('/file.txt', 0, 0); // owned by root
    expect(() => vol.accessSync('/file.txt', AMODE.W_OK)).toThrow(expect.objectContaining({ code: 'EACCES' }));
  });

  it('grants access via group membership using custom gid', () => {
    const vol = Volume.fromJSON({ '/file.txt': 'data' }, '/', { process: makeProcess(2000, 1000) });
    vol.chmodSync('/file.txt', 0o040); // group read-only
    vol.chownSync('/file.txt', 0, 1000); // owned by root, group 1000
    // uid 2000 belongs to gid 1000 which has read permission
    expect(() => vol.accessSync('/file.txt', AMODE.R_OK)).not.toThrow();
  });

  it('grants access via world permissions regardless of custom uid', () => {
    const vol = Volume.fromJSON({ '/file.txt': 'data' }, '/', { process: makeProcess(9999, 9999) });
    vol.chmodSync('/file.txt', 0o004); // world read
    vol.chownSync('/file.txt', 0, 0);
    expect(() => vol.accessSync('/file.txt', AMODE.R_OK)).not.toThrow();
  });
});
