import { describe, expect, it } from "vitest";
import { selectAll, selectByIds } from "./paginate";

const table = Array.from({ length: 2345 }, (_, i) => ({ id: i, owner: `u${i % 400}` }));

describe("paging past the 1,000-row cap", () => {
  it("reads every page", async () => {
    const calls: [number, number][] = [];
    const rows = await selectAll(async (from, to) => {
      calls.push([from, to]);
      return { data: table.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(2345);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("chunks long id lists and dedupes them", async () => {
    const ids = Array.from({ length: 400 }, (_, i) => `u${i}`);
    const seen: number[] = [];
    const rows = await selectByIds([...ids, "u1"], async (chunk, from, to) => {
      seen.push(chunk.length);
      return {
        data: table.filter((r) => chunk.includes(r.owner)).slice(from, to + 1),
        error: null,
      };
    });
    expect(rows).toHaveLength(2345);
    expect(seen.every((n) => n <= 150)).toBe(true);
  });

  it("throws instead of returning a partial list", async () => {
    await expect(
      selectAll(async () => ({ data: null, error: { message: "boom" } })),
    ).rejects.toThrow("boom");
  });
});
