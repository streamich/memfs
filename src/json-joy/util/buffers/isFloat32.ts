const view = new DataView(new ArrayBuffer(4));

export const isFloat32 = (n: number): boolean => {
  view.setFloat32(0, n);
  return n === view.getFloat32(0);
};
