import { bench, describe } from "vitest";
import parsePr from "./parsePr";

// concatenate programatically generated string of 1000 characters
const LONG_BODY =
  new Array(1_000)
    .fill(
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Sunt, earum. Atque architecto vero veniam est tempora fugiat sint quo praesentium quia. Autem, veritatis omnis beatae iste delectus recusandae animi non."
    )
    .join("\n") + "fixes #123";

describe("parsePr", () => {
  bench("short body", () => {
    parsePr({
      body: "fixes #123",
      title: "test",
      number: 124,
    });
  });

  bench("long body", () => {
    parsePr({
      body: LONG_BODY,
      title: "test",
      number: 124,
    });
  });
});
