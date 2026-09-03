import { AMODE, FLAG, FLAG_CON, PATH, S, SEP, constants } from '..';

// FLAG_CON is a const enum, so its members have to be spelled out to be read at runtime.
const flagCon: Record<keyof typeof FLAG_CON, number> = {
  O_RDONLY: FLAG_CON.O_RDONLY,
  O_WRONLY: FLAG_CON.O_WRONLY,
  O_RDWR: FLAG_CON.O_RDWR,
  O_ACCMODE: FLAG_CON.O_ACCMODE,
  O_CREAT: FLAG_CON.O_CREAT,
  O_EXCL: FLAG_CON.O_EXCL,
  O_NOCTTY: FLAG_CON.O_NOCTTY,
  O_TRUNC: FLAG_CON.O_TRUNC,
  O_APPEND: FLAG_CON.O_APPEND,
  O_NONBLOCK: FLAG_CON.O_NONBLOCK,
  O_DSYNC: FLAG_CON.O_DSYNC,
  FASYNC: FLAG_CON.FASYNC,
  O_DIRECT: FLAG_CON.O_DIRECT,
  O_LARGEFILE: FLAG_CON.O_LARGEFILE,
  O_DIRECTORY: FLAG_CON.O_DIRECTORY,
  O_NOFOLLOW: FLAG_CON.O_NOFOLLOW,
  O_NOATIME: FLAG_CON.O_NOATIME,
  O_CLOEXEC: FLAG_CON.O_CLOEXEC,
  O_SYNC: FLAG_CON.O_SYNC,
  O_NDELAY: FLAG_CON.O_NDELAY,
};

const flag = FLAG as unknown as Record<string, number>;
const consts = constants as Record<string, number>;
const flagKeys = Object.keys(FLAG).filter(key => isNaN(+key));

describe('constants', () => {
  test('FLAG agrees with constants on every shared key', () => {
    const shared = Object.keys(consts).filter(key => key in FLAG);
    expect(shared.length).toBeGreaterThan(10);
    for (const key of shared) expect([key, flag[key]]).toEqual([key, consts[key]]);
  });

  test('FLAG_CON has the same keys and values as FLAG', () => {
    expect([...flagKeys].sort()).toEqual(Object.keys(flagCon).sort());
    for (const key of flagKeys) expect([key, flagCon[key]]).toEqual([key, flag[key]]);
  });

  test('AMODE agrees with constants', () => {
    expect(AMODE.F_OK).toBe(constants.F_OK);
    expect(AMODE.R_OK).toBe(constants.R_OK);
    expect(AMODE.W_OK).toBe(constants.W_OK);
    expect(AMODE.X_OK).toBe(constants.X_OK);
  });

  test('S agrees with constants on the permission bits', () => {
    expect(S.IRUSR).toBe(constants.S_IRUSR);
    expect(S.IWUSR).toBe(constants.S_IWUSR);
    expect(S.IXUSR).toBe(constants.S_IXUSR);
    expect(S.IRGRP).toBe(constants.S_IRGRP);
    expect(S.IWGRP).toBe(constants.S_IWGRP);
    expect(S.IXGRP).toBe(constants.S_IXGRP);
    expect(S.IROTH).toBe(constants.S_IROTH);
    expect(S.IWOTH).toBe(constants.S_IWOTH);
    expect(S.IXOTH).toBe(constants.S_IXOTH);
  });

  test('SEP agrees with PATH.SEP', () => {
    expect(SEP).toBe(PATH.SEP);
  });
});
