export default function getBigInt(number): BigInt {
  if (typeof BigInt === 'function') return BigInt(number);
  else throw new Error('BigInt is not supported in this environment.');
}
