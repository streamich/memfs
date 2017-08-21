
export const constants = {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    S_IFMT: 61440,
    S_IFREG: 32768,
    S_IFDIR: 16384,
    S_IFCHR: 8192,
    S_IFBLK: 24576,
    S_IFIFO: 4096,
    S_IFLNK: 40960,
    S_IFSOCK: 49152,
    O_CREAT: 64,
    O_EXCL: 128,
    O_NOCTTY: 256,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536,
    O_NOATIME: 262144,
    O_NOFOLLOW: 131072,
    O_SYNC: 1052672,
    O_DIRECT: 16384,
    O_NONBLOCK: 2048,
    S_IRWXU: 448,
    S_IRUSR: 256,
    S_IWUSR: 128,
    S_IXUSR: 64,
    S_IRWXG: 56,
    S_IRGRP: 32,
    S_IWGRP: 16,
    S_IXGRP: 8,
    S_IRWXO: 7,
    S_IROTH: 4,
    S_IWOTH: 2,
    S_IXOTH: 1,

    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
};

export const enum S {
    ISUID = 0b100000000000, //  (04000)  set-user-ID (set process effective user ID on execve(2))
    ISGID = 0b10000000000, // (02000)  set-group-ID (set process effective group ID on execve(2); mandatory locking, as described in fcntl(2); take a new file's group from parent directory, as described in chown(2) and mkdir(2))
    ISVTX = 0b1000000000, // (01000)  sticky bit (restricted deletion flag, as described in unlink(2))
    IRUSR = 0b100000000, //  (00400)  read by owner
    IWUSR = 0b10000000, // (00200)  write by owner
    IXUSR = 0b1000000, // (00100)  execute/search by owner
    IRGRP = 0b100000, // (00040)  read by group
    IWGRP = 0b10000, // (00020)  write by group
    IXGRP = 0b1000, // (00010)  execute/search by group
    IROTH = 0b100, // (00004)  read by others
    IWOTH = 0b10, //  (00002)  write by others
    IXOTH = 0b1, //  (00001)  execute/search by others
}
