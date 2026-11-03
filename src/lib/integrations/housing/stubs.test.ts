import { describe, expect, it } from "vitest";
import { EntrataStubAdapter, YardiStubAdapter } from "./stubs";
import { NotConfiguredError } from "./adapter";

describe("off-campus partner stubs", () => {
  for (const make of [EntrataStubAdapter, YardiStubAdapter]) {
    it(`${make().provider} makes no calls and says it isn't configured`, async () => {
      const adapter = make();
      expect((await adapter.testConnection()).ok).toBe(false);
      await expect(adapter.pushRoommateGroups()).rejects.toBeInstanceOf(NotConfiguredError);
      await expect(adapter.pullAssignments()).rejects.toBeInstanceOf(NotConfiguredError);
      await expect(adapter.pullRoomChanges()).rejects.toBeInstanceOf(NotConfiguredError);
    });
  }
});
