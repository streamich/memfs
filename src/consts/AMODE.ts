// Constants used in `access` system call, see [access(2)](http://man7.org/linux/man-pages/man2/faccessat.2.html).
export const enum AMODE {
  /* Tests for the existence of the file. */
  F_OK = 0,
  /** Tests for Execute or Search permissions. */
  X_OK = 1,
  /** Tests for Write permission. */
  W_OK = 2,
  /** Tests for Read permission. */
  R_OK = 4,
}
