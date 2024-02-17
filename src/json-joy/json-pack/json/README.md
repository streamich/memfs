## Benchmarks

Encoding:

```
npx ts-node benchmarks/json-pack/bench.json.encoding.ts
=============================================================================== Benchmark: Encoding
Warmup: 1000x , Node.js: v18.16.0 , Arch: arm64 , CPU: Apple M1
---------------------------------------------------------------------------- Small object, 44 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 5,800,937 ops/sec ±0.90% (98 runs sampled)
👍 Buffer.from(JSON.stringify()) x 2,220,449 ops/sec ±0.71% (97 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 1,998,965 ops/sec ±0.68% (96 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 1,396,750 ops/sec ±0.80% (99 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
------------------------------------------------------------------------- Typical object, 993 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 320,862 ops/sec ±1.81% (98 runs sampled)
👍 Buffer.from(JSON.stringify()) x 214,464 ops/sec ±0.49% (100 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 187,439 ops/sec ±0.68% (97 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 119,426 ops/sec ±1.93% (93 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
-------------------------------------------------------------------------- Large object, 3741 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 87,901 ops/sec ±1.22% (95 runs sampled)
👍 Buffer.from(JSON.stringify()) x 65,695 ops/sec ±1.06% (96 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 56,424 ops/sec ±1.80% (99 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 38,689 ops/sec ±1.77% (96 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
-------------------------------------------------------------------- Very large object, 45750 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 6,087 ops/sec ±0.45% (98 runs sampled)
👍 Buffer.from(JSON.stringify()) x 6,094 ops/sec ±0.21% (99 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 4,133 ops/sec ±0.97% (98 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 1,813 ops/sec ±0.26% (99 runs sampled)
Fastest is 👍 Buffer.from(JSON.stringify()),👍 json-joy/json-pack JsonEncoder.encode()
------------------------------------------------------------------ Object with many keys, 969 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 251,763 ops/sec ±0.65% (98 runs sampled)
👍 Buffer.from(JSON.stringify()) x 194,535 ops/sec ±0.13% (99 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 154,017 ops/sec ±0.15% (99 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 64,720 ops/sec ±0.13% (98 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
------------------------------------------------------------------------- String ladder, 3398 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 146,873 ops/sec ±0.44% (99 runs sampled)
👍 Buffer.from(JSON.stringify()) x 127,235 ops/sec ±0.46% (93 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 126,412 ops/sec ±0.10% (101 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 126,018 ops/sec ±0.21% (101 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
-------------------------------------------------------------------------- Long strings, 7011 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 50,734 ops/sec ±0.10% (99 runs sampled)
👍 Buffer.from(JSON.stringify()) x 29,757 ops/sec ±0.32% (100 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 29,607 ops/sec ±0.43% (99 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 29,563 ops/sec ±0.59% (97 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
-------------------------------------------------------------------------- Short strings, 170 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 1,597,067 ops/sec ±0.14% (98 runs sampled)
👍 Buffer.from(JSON.stringify()) x 979,318 ops/sec ±1.18% (99 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 826,713 ops/sec ±1.74% (93 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 815,531 ops/sec ±3.65% (87 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
-------------------------------------------------------------------------------- Numbers, 136 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 1,382,467 ops/sec ±4.90% (78 runs sampled)
👍 Buffer.from(JSON.stringify()) x 1,009,130 ops/sec ±1.66% (91 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 821,214 ops/sec ±4.36% (88 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 886,689 ops/sec ±0.33% (99 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
--------------------------------------------------------------------------------- Tokens, 308 bytes
👍 json-joy/json-pack JsonEncoder.encode() x 1,357,017 ops/sec ±0.38% (98 runs sampled)
👍 Buffer.from(JSON.stringify()) x 965,756 ops/sec ±0.19% (93 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify()) x 648,336 ops/sec ±0.45% (96 runs sampled)
👍 fast-safe-stringify + Buffer.from(safeStringify.stableStringify()) x 642,934 ops/sec ±0.34% (97 runs sampled)
Fastest is 👍 json-joy/json-pack JsonEncoder.encode()
```

Decoding:

```
npx ts-node benchmarks/json-pack/bench.json.decoding.ts
=============================================================================== Benchmark: Encoding
Warmup: 1000x , Node.js: v18.16.0 , Arch: arm64 , CPU: Apple M1
--------------------------------------------------------------------------- Small object, 175 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 1,149,110 ops/sec ±0.16% (99 runs sampled)
👍 Native JSON.parse(buf.toString()) x 2,360,476 ops/sec ±0.56% (94 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
------------------------------------------------------------------------ Typical object, 3587 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 86,604 ops/sec ±0.56% (98 runs sampled)
👍 Native JSON.parse(buf.toString()) x 245,029 ops/sec ±1.28% (98 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
------------------------------------------------------------------------- Large object, 13308 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 25,911 ops/sec ±0.64% (102 runs sampled)
👍 Native JSON.parse(buf.toString()) x 67,049 ops/sec ±0.15% (100 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
------------------------------------------------------------------- Very large object, 162796 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 1,494 ops/sec ±0.32% (100 runs sampled)
👍 Native JSON.parse(buf.toString()) x 3,557 ops/sec ±0.33% (100 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
----------------------------------------------------------------- Object with many keys, 3339 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 47,767 ops/sec ±0.90% (100 runs sampled)
👍 Native JSON.parse(buf.toString()) x 280,836 ops/sec ±2.21% (94 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
------------------------------------------------------------------------ String ladder, 13302 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 60,041 ops/sec ±1.26% (94 runs sampled)
👍 Native JSON.parse(buf.toString()) x 317,991 ops/sec ±1.08% (98 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
------------------------------------------------------------------------- Long strings, 30251 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 37,350 ops/sec ±0.76% (98 runs sampled)
👍 Native JSON.parse(buf.toString()) x 44,679 ops/sec ±0.40% (97 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
-------------------------------------------------------------------------- Short strings, 625 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 311,662 ops/sec ±0.59% (97 runs sampled)
👍 Native JSON.parse(buf.toString()) x 1,131,918 ops/sec ±1.40% (97 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
-------------------------------------------------------------------------------- Numbers, 434 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 631,451 ops/sec ±0.23% (99 runs sampled)
👍 Native JSON.parse(buf.toString()) x 1,815,177 ops/sec ±0.55% (94 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
-------------------------------------------------------------------------------- Tokens, 1182 bytes
👍 json-joy/json-pack JsonDecoder.decode() x 1,312,357 ops/sec ±0.55% (99 runs sampled)
👍 Native JSON.parse(buf.toString()) x 1,385,641 ops/sec ±2.35% (94 runs sampled)
Fastest is 👍 Native JSON.parse(buf.toString())
```
