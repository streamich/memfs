const pow = Math.pow;

export const decodeF16 = (binary: number): number => {
  const exponent = (binary & 0x7c00) >> 10;
  const fraction = binary & 0x03ff;
  return (
    (binary >> 15 ? -1 : 1) *
    (exponent
      ? exponent === 0x1f
        ? fraction
          ? NaN
          : Infinity
        : pow(2, exponent - 15) * (1 + fraction / 0x400)
      : 6.103515625e-5 * (fraction / 0x400))
  );
};
