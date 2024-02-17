# `decodeUtf8`

Decodes UTF-8 text from `Uint8Array` buffer to JavaScript string (UTF-16).

- `Buffer.from(arr).subarray` (v4) is always faster than `Buffer.from(arr).slice` (v3).
- `Buffer.prototype.utf8Slice` (v2) is always faster than `Buffer.from(arr).subarray` (v4).
  - But `Buffer.prototype.utf8Slice` (v2) is Node's internal implementation detail, so we need
    to be able to fall back to `Buffer.from(arr).subarray` (v4).
- "JS with string concatenation" (v5) is fastest for tiny strings.
- "JS with buffering in array" (v1) is fastest for medium sized strings.
- `TextDecoder` (v6) is slower than any `Buffer` methods.
  - However, `Buffer` is not available on the browser (and possibly other environments). So,
    for long strings would be beneficial to use `TextDecoder` (v6).
- (v10) seems to be faster than (v5).
- (v9) seems to be the fastest out of the buffering approaches.


Benchmarks:

```
node benchmarks/util/buffers/bench.decodeUtf8.js
============================================================================= Benchmark: decodeUtf8
Warming up each runner 1000x
------------------------------------------------------------------------- Single character, 1 bytes
👍 JS with buffering in array (v1) x 45,587,314 ops/sec ±0.35% (91 runs sampled)
👍 Buffer.prototype.utf8Slice (v2) x 9,669,294 ops/sec ±0.08% (95 runs sampled)
👍 Buffer.from(arr).slice (v3) x 6,522,838 ops/sec ±0.18% (93 runs sampled)
👍 Buffer.from(arr).subarray (v4) x 7,004,453 ops/sec ±0.17% (99 runs sampled)
👍 JS with string concatenation (v5) x 157,127,790 ops/sec ±0.08% (98 runs sampled)
👍 TextDecoder (v6) x 1,405,754 ops/sec ±1.57% (84 runs sampled)
Fastest is 👍 JS with string concatenation (v5)
---------------------------------------------------------------------------------- "Hello", 5 bytes
👍 JS with buffering in array (v1) x 26,293,330 ops/sec ±0.17% (98 runs sampled)
👍 Buffer.prototype.utf8Slice (v2) x 9,595,299 ops/sec ±0.13% (97 runs sampled)
👍 Buffer.from(arr).slice (v3) x 6,597,346 ops/sec ±0.27% (90 runs sampled)
👍 Buffer.from(arr).subarray (v4) x 6,913,974 ops/sec ±0.17% (98 runs sampled)
👍 JS with string concatenation (v5) x 33,109,095 ops/sec ±0.17% (100 runs sampled)
👍 TextDecoder (v6) x 1,393,950 ops/sec ±1.31% (87 runs sampled)
Fastest is 👍 JS with string concatenation (v5)
------------------------------------------------------------------- Short text with emoji, 14 bytes
👍 JS with buffering in array (v1) x 13,746,402 ops/sec ±0.61% (94 runs sampled)
👍 Buffer.prototype.utf8Slice (v2) x 8,573,654 ops/sec ±0.13% (99 runs sampled)
👍 Buffer.from(arr).slice (v3) x 6,003,418 ops/sec ±0.42% (97 runs sampled)
👍 Buffer.from(arr).subarray (v4) x 6,163,374 ops/sec ±0.35% (99 runs sampled)
👍 JS with string concatenation (v5) x 7,468,848 ops/sec ±0.26% (99 runs sampled)
👍 TextDecoder (v6) x 1,358,357 ops/sec ±1.32% (72 runs sampled)
Fastest is 👍 JS with buffering in array (v1)
--------------------------------------------------------------------- Repeating characters, 8 bytes
👍 JS with buffering in array (v1) x 18,606,797 ops/sec ±0.37% (99 runs sampled)
👍 Buffer.prototype.utf8Slice (v2) x 9,210,861 ops/sec ±0.26% (99 runs sampled)
👍 Buffer.from(arr).slice (v3) x 6,398,227 ops/sec ±0.23% (96 runs sampled)
👍 Buffer.from(arr).subarray (v4) x 6,820,514 ops/sec ±0.22% (99 runs sampled)
👍 JS with string concatenation (v5) x 17,943,107 ops/sec ±0.35% (94 runs sampled)
👍 TextDecoder (v6) x 1,448,300 ops/sec ±1.36% (75 runs sampled)
Fastest is 👍 JS with buffering in array (v1)
-------------------------------------------------------------------- Repeating characters, 16 bytes
🤞 JS with buffering in array (v1) x 12,181,356 ops/sec ±0.26% (100 runs sampled)
🤞 Buffer.prototype.utf8Slice (v2) x 9,254,890 ops/sec ±0.25% (97 runs sampled)
🤞 Buffer.from(arr).slice (v3) x 6,407,754 ops/sec ±0.20% (99 runs sampled)
🤞 Buffer.from(arr).subarray (v4) x 6,738,914 ops/sec ±0.25% (98 runs sampled)
🤞 JS with string concatenation (v5) x 9,530,473 ops/sec ±0.21% (101 runs sampled)
🤞 TextDecoder (v6) x 1,456,139 ops/sec ±1.28% (77 runs sampled)
Fastest is 🤞 JS with buffering in array (v1)
-------------------------------------------------------------------- Repeating characters, 32 bytes
🤞 JS with buffering in array (v1) x 6,327,652 ops/sec ±0.24% (100 runs sampled)
🤞 Buffer.prototype.utf8Slice (v2) x 8,958,249 ops/sec ±0.22% (99 runs sampled)
🤞 Buffer.from(arr).slice (v3) x 6,217,455 ops/sec ±0.23% (98 runs sampled)
🤞 Buffer.from(arr).subarray (v4) x 6,500,127 ops/sec ±0.18% (101 runs sampled)
🤞 JS with string concatenation (v5) x 5,647,992 ops/sec ±0.14% (99 runs sampled)
🤞 TextDecoder (v6) x 1,452,152 ops/sec ±1.26% (79 runs sampled)
Fastest is 🤞 Buffer.prototype.utf8Slice (v2)
-------------------------------------------------------------------- Repeating characters, 64 bytes
🤞 JS with buffering in array (v1) x 3,141,539 ops/sec ±0.23% (99 runs sampled)
🤞 Buffer.prototype.utf8Slice (v2) x 8,898,315 ops/sec ±0.21% (99 runs sampled)
🤞 Buffer.from(arr).slice (v3) x 5,947,900 ops/sec ±0.24% (99 runs sampled)
🤞 Buffer.from(arr).subarray (v4) x 6,380,096 ops/sec ±0.17% (102 runs sampled)
🤞 JS with string concatenation (v5) x 3,027,083 ops/sec ±0.15% (96 runs sampled)
🤞 TextDecoder (v6) x 1,387,153 ops/sec ±0.86% (85 runs sampled)
Fastest is 🤞 Buffer.prototype.utf8Slice (v2)
------------------------------------------------------------------- Repeating characters, 128 bytes
🤞 JS with buffering in array (v1) x 1,525,792 ops/sec ±0.18% (98 runs sampled)
🤞 Buffer.prototype.utf8Slice (v2) x 8,600,267 ops/sec ±0.17% (98 runs sampled)
🤞 Buffer.from(arr).slice (v3) x 5,676,294 ops/sec ±0.16% (98 runs sampled)
🤞 Buffer.from(arr).subarray (v4) x 6,014,855 ops/sec ±0.23% (100 runs sampled)
🤞 JS with string concatenation (v5) x 1,612,844 ops/sec ±0.10% (100 runs sampled)
🤞 TextDecoder (v6) x 1,304,084 ops/sec ±1.14% (86 runs sampled)
Fastest is 🤞 Buffer.prototype.utf8Slice (v2)
------------------------------------------------------------------- Repeating characters, 256 bytes
🤞 JS with buffering in array (v1) x 673,037 ops/sec ±0.08% (98 runs sampled)
🤞 Buffer.prototype.utf8Slice (v2) x 7,934,918 ops/sec ±0.26% (99 runs sampled)
🤞 Buffer.from(arr).slice (v3) x 4,803,526 ops/sec ±0.25% (98 runs sampled)
🤞 Buffer.from(arr).subarray (v4) x 5,007,603 ops/sec ±0.27% (94 runs sampled)
🤞 JS with string concatenation (v5) x 816,504 ops/sec ±0.19% (101 runs sampled)
🤞 TextDecoder (v6) x 1,123,970 ops/sec ±0.90% (92 runs sampled)
Fastest is 🤞 Buffer.prototype.utf8Slice (v2)
```
