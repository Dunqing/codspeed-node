import { bench, describe } from "vitest";

describe("sample", () => {
  bench("switch 1", () => {
    let a = 1;
    let b = 2;
    const c = a;
    a = b;
    b = c;
  });

  bench("switch 2", () => {
    let a = 1;
    let b = 10;
    a = b + a;
    b = a - b;
    a = b - a;
  });
});
