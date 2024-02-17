export const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const res = new Uint8Array(a.length + b.length);
  res.set(a);
  res.set(b, a.length);
  return res;
};

export const concatList = (list: Uint8Array[]): Uint8Array => {
  const length = list.length;
  let size = 0,
    offset = 0;
  for (let i = 0; i < length; i++) size += list[i].length;
  const res = new Uint8Array(size);
  for (let i = 0; i < length; i++) {
    const item = list[i];
    res.set(item, offset);
    offset += item.length;
  }
  return res;
};

export const listToUint8 = (list: Uint8Array[]): Uint8Array => {
  switch (list.length) {
    case 0:
      return new Uint8Array(0);
    case 1:
      return list[0];
    default:
      return concatList(list);
  }
};
