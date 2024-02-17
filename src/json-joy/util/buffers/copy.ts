export const copy = <T extends Uint8Array>(arr: T): T => {
  const dupe = new Uint8Array(arr.length) as T;
  dupe.set(arr);
  return dupe;
};
