let hasBigInt = false;
try {
  hasBigInt = typeof BigInt === 'function';
} catch {}
export default hasBigInt;
