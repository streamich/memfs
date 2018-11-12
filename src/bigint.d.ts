// This definition file is here as a workaround and should be replaced
// by "esnext.bigint" library when TypeScript will support `BigInt` type.
// Track this at Microsoft/TypeScript#15096.

type BigInt = number;
declare const BigInt: typeof Number;
