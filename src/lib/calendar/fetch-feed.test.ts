import { describe, expect, it, vi } from "vitest";
import type { LookupAddress } from "node:dns";

vi.mock("server-only", () => ({}));

describe("feed fetch DNS lookup", () => {
  const resolver =
    (addresses: LookupAddress[]) =>
    (_host: string, _opts: unknown, cb: (e: Error | null, a: LookupAddress[]) => void) =>
      cb(null, addresses);

  it("connects only to public addresses, checked by the connection's own lookup", async () => {
    const { publicOnlyLookup, FeedError } = await import("./fetch-feed");
    const lookup = publicOnlyLookup(resolver([{ address: "93.184.215.14", family: 4 }]) as never);
    const got = await new Promise<[Error | null, string]>((resolve) =>
      lookup("calendar.example", {}, (e, address) => resolve([e, address as string])),
    );
    expect(got).toEqual([null, "93.184.215.14"]);

    // A name that resolves (or rebinds) to a private address is refused at connect time.
    for (const address of ["127.0.0.1", "10.0.0.5", "169.254.169.254", "::1"]) {
      const blocked = publicOnlyLookup(
        resolver([{ address, family: address.includes(":") ? 6 : 4 }]) as never,
      );
      const error = await new Promise<Error | null>((resolve) =>
        blocked("calendar.example", {}, (e) => resolve(e)),
      );
      expect(error).toBeInstanceOf(FeedError);
    }

    // Mixed answers are refused too: one private address is enough.
    const mixed = publicOnlyLookup(
      resolver([
        { address: "93.184.215.14", family: 4 },
        { address: "192.168.1.1", family: 4 },
      ]) as never,
    );
    const error = await new Promise<Error | null>((resolve) =>
      mixed("calendar.example", {}, (e) => resolve(e)),
    );
    expect(error).toBeInstanceOf(FeedError);
  });

  it("answers in the shape the socket asked for", async () => {
    const { publicOnlyLookup } = await import("./fetch-feed");
    const addresses = [
      { address: "93.184.215.14", family: 4 },
      { address: "2606:2800:21f:cb07:6820:80da:af6b:8b2c", family: 6 },
    ];
    const lookup = publicOnlyLookup(resolver(addresses) as never);
    const all = await new Promise<unknown>((resolve) =>
      lookup("calendar.example", { all: true }, (_e, a) => resolve(a)),
    );
    expect(all).toEqual(addresses);
    const v6 = await new Promise<unknown>((resolve) =>
      lookup("calendar.example", { family: 6 }, (_e, a) => resolve(a)),
    );
    expect(v6).toBe("2606:2800:21f:cb07:6820:80da:af6b:8b2c");
  });
});
