export const makeXorShift32 = (seed: number = 1 + Math.round(Math.random() * ((-1>>>0)-1))) => {
  let x = seed|0;
  return function xorShift32() {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return x;
  };
}

export const xorShift32 = makeXorShift32();
