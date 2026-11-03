import { describe, expect, it } from "vitest";
import { mutualIds } from "./mutuals";

const person = (id: string, optedIn = true) => ({ id, optedIn });

describe("mutualIds", () => {
  it("keeps only people both know who opted in", () => {
    const mine = [person("a"), person("b", false), person("c")];
    const theirs = [person("a"), person("b"), person("d")];
    expect(mutualIds(mine, theirs)).toEqual(["a"]);
  });

  it("drops duplicates and people only one side knows", () => {
    expect(mutualIds([person("a"), person("a")], [person("a"), person("z")])).toEqual(["a"]);
    expect(mutualIds([person("a")], [])).toEqual([]);
  });
});
