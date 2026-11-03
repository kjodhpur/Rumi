import { describe, it, expect } from "vitest";
import { EntrataStubAdapter, YardiStubAdapter } from "./stubs";
import { NotConfiguredError } from "./adapter";

describe("Housing Stubs (Off-campus partners)", () => {
  it("EntrataStubAdapter testConnection returns helpful guidance and operations throw NotConfiguredError", async () => {
    const adapter = new EntrataStubAdapter();
    const status = await adapter.testConnection();
    expect(status.ok).toBe(false);
    expect(status.provider).toBe("entrata");
    expect(status.message).toContain("Contact Rumi support");

    await expect(adapter.pushRoommateGroups("asu")).rejects.toThrow(NotConfiguredError);
    await expect(adapter.pullAssignments("asu")).rejects.toThrow(NotConfiguredError);
    await expect(adapter.pullRoomChanges("asu")).rejects.toThrow(NotConfiguredError);
  });

  it("YardiStubAdapter testConnection returns helpful guidance and operations throw NotConfiguredError", async () => {
    const adapter = new YardiStubAdapter();
    const status = await adapter.testConnection();
    expect(status.ok).toBe(false);
    expect(status.provider).toBe("yardi");
    expect(status.message).toContain("Contact Rumi support");

    await expect(adapter.pushRoommateGroups("asu")).rejects.toThrow(NotConfiguredError);
    await expect(adapter.pullAssignments("asu")).rejects.toThrow(NotConfiguredError);
    await expect(adapter.pullRoomChanges("asu")).rejects.toThrow(NotConfiguredError);
  });
});
