/**
 * Contract tests for the StarRez REST adapter against a mock StarRez (msw). The real
 * endpoints and fields are confirmed per school; these tests pin our side of the contract:
 * auth header, payload shape, field mapping, throttling, retries and partial failures.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { StarRezRestAdapter, TokenBucket } from "./rest";
import { planImport } from "./import";
import type { RoommateGroup } from "../housing/adapter";

const BASE = "https://starrez.example.test";
const groupsSeen = new Map<string, unknown>();
let failNext429 = 0;
let failGroupNamed: string | null = null;

const server = setupServer(
  http.get(`${BASE}/services/health`, ({ request }) =>
    request.headers.get("authorization") === `Basic ${Buffer.from("rumi:secret").toString("base64")}` ? HttpResponse.json({ ok: true }) : new HttpResponse(null, { status: 401 }),
  ),
  http.post(`${BASE}/services/roommategroups`, async ({ request }) => {
    if (failNext429 > 0) {
      failNext429 -= 1;
      return new HttpResponse(null, { status: 429, headers: { "Retry-After": "0" } });
    }
    const body = (await request.json()) as { GroupName: string; ExternalReference: string; Members: unknown[] };
    if (body.GroupName === failGroupNamed) return HttpResponse.json({ error: "room full" }, { status: 400 });
    groupsSeen.set(body.ExternalReference, body); // keyed by our reference: re-push is idempotent
    return HttpResponse.json({ id: body.ExternalReference });
  }),
  http.get(`${BASE}/services/assignments`, ({ request }) => {
    const since = new URL(request.url).searchParams.get("since");
    const rows = [...groupsSeen.values()].flatMap((g, i) =>
      ((g as { Members: { EntryID: string; Email: string }[] }).Members).map((m, j) => ({ EntryID: m.EntryID, Email: m.Email, RoomLocation: "Tooker House", RoomSpace: String(100 + i), Bed: j ? "B" : "A", TermCode: "FALL2026", CheckInDate: "2026-08-15T09:00:00" })),
    );
    return HttpResponse.json(since ? rows.slice(0, 2) : rows);
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  failNext429 = 0;
  failGroupNamed = null;
});
afterAll(() => server.close());

const adapter = (password = "secret") =>
  new StarRezRestAdapter({ baseUrl: BASE, username: "rumi", password }, fetch, { bucket: new TokenBucket(1000, 1000), backoffMs: 1 });

const groups: RoommateGroup[] = Array.from({ length: 50 }, (_, i) => ({
  ref: `pairing-${i}`,
  name: `Group ${i}`,
  term: "FALL2026",
  members: [
    { studentId: `${1000 + i * 2}`, email: `s${i * 2}@asu.edu`, leader: true },
    { studentId: `${1001 + i * 2}`, email: `s${i * 2 + 1}@asu.edu`, leader: false },
  ],
}));

describe("StarRez REST adapter (mock server)", () => {
  it("checks the connection with basic auth and reports bad credentials", async () => {
    expect((await adapter().testConnection()).ok).toBe(true);
    const bad = await adapter("wrong").testConnection();
    expect(bad).toMatchObject({ ok: false, message: "StarRez rejected the credentials." });
  });

  it("round trip: push 50 groups, then pull their assignments", async () => {
    groupsSeen.clear();
    const pushed = await adapter().pushRoommateGroups(groups);
    expect(pushed).toEqual({ success: true, recordsPushed: 50, errors: [] });
    const assignments = await adapter().pullAssignments();
    expect(assignments).toHaveLength(100);
    expect(assignments[0]).toEqual({ studentId: "1000", email: "s0@asu.edu", building: "Tooker House", room: "100", bed: "A", term: "FALL2026", movedIn: "2026-08-15" });
  });

  it("is idempotent: pushing again doesn't duplicate, and re-importing changes nothing", async () => {
    groupsSeen.clear();
    await adapter().pushRoommateGroups(groups);
    await adapter().pushRoommateGroups(groups);
    expect(groupsSeen.size).toBe(50);
    const rows = (await adapter().pullAssignments()).map((a, i) => ({ line: i + 1, ...a, building: a.building }));
    const lookup = { byStudentId: new Map(rows.map((r) => [r.studentId!, `u${r.studentId}`])), byEmail: new Map<string, string>() };
    const first = planImport(rows, lookup, []);
    expect(first.inserts).toHaveLength(100);
    const existing = first.inserts.map((r, i) => ({ id: `a${i}`, userId: r.userId, building: r.building, room: r.room, bed: r.bed, externalRef: r.externalRef }));
    expect(planImport(rows, lookup, existing)).toMatchObject({ inserts: [], updates: [], unchanged: 100 });
  });

  it("surfaces partial failures instead of stopping", async () => {
    groupsSeen.clear();
    failGroupNamed = "Group 7";
    const pushed = await adapter().pushRoommateGroups(groups);
    expect(pushed.success).toBe(false);
    expect(pushed.recordsPushed).toBe(49);
    expect(pushed.errors).toEqual([{ id: "pairing-7", error: "StarRez answered 400" }]);
  });

  it("retries a 429 and respects Retry-After", async () => {
    groupsSeen.clear();
    failNext429 = 2;
    const a = adapter();
    const pushed = await a.pushRoommateGroups(groups.slice(0, 1));
    expect(pushed.recordsPushed).toBe(1);
    expect(a.calls).toBe(3);
  });

  it("passes `since` for incremental pulls", async () => {
    groupsSeen.clear();
    await adapter().pushRoommateGroups(groups.slice(0, 3));
    expect(await adapter().pullAssignments(new Date("2026-08-01T00:00:00Z"))).toHaveLength(2);
  });
});

describe("token bucket", () => {
  it("allows the burst, then throttles to the documented rate", async () => {
    let t = 0;
    const bucket = new TokenBucket(100, 100 / 60, () => t);
    for (let i = 0; i < 100; i++) await bucket.take();
    expect(bucket.available()).toBe(0);
    await expect(bucket.take(100)).rejects.toThrow(/rate limit/);
    t += 6000; // 6 s → 10 tokens
    expect(bucket.available()).toBe(10);
  });
});
