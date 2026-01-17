export interface Ok<T> {
  ok: true;
  value: T;
}

export interface Err<E> {
  ok: false;
  err: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

export function Ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function Err<E>(err: E): Err<E> {
  return { ok: false, err };
}
