import { assertEquals } from "jsr:@std/assert";
import { CoreDeno } from "../CoreDeno";

Deno.test("simple test", () => {
  const x = 1 + 2;
  assertEquals(x, 3);
});
