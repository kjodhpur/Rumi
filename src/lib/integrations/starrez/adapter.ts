import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import {
  HousingSystemAdapter,
  ConnectionStatus,
  HousingAssignment,
  HousingRoomChange,
  PushResult,
} from "../housing/adapter";
import { EntrataStubAdapter, YardiStubAdapter } from "../housing/stubs";
import { StarRezClient, StarRezCredentials, StarRezGroupPayload } from "./client";
import { buildStarRezExport } from "./export";
import { Json } from "@/types/database";

export class StarRezRestAdapter implements HousingSystemAdapter {
  provider = "starrez";
  private client: StarRezClient | null = null;

  constructor(private schoolId: string) {}

  private async getClient(): Promise<StarRezClient> {
    if (this.client) return this.client;

    const db = createAdminClient();
    const { data: creds } = await db
      .from("integration_credentials")
      .select("base_url, credentials_enc, active")
      .eq("school_id", this.schoolId)
      .eq("provider", "starrez")
      .maybeSingle();

    if (!creds || !creds.active) {
      // Default to sandbox/mock client if no active credentials stored
      this.client = new StarRezClient("https://starrez.asu.edu/services/mock", { apiKey: "mock_key" }, { isMock: true });
      return this.client;
    }

    let parsed: StarRezCredentials = { apiKey: "" };
    try {
      const decrypted = decrypt(creds.credentials_enc);
      parsed = JSON.parse(decrypted);
    } catch {
      parsed = { apiKey: creds.credentials_enc };
    }

    this.client = new StarRezClient(creds.base_url, parsed);
    return this.client;
  }

  async testConnection(): Promise<ConnectionStatus> {
    const client = await this.getClient();
    const result = await client.testConnection();
    return {
      ok: result.ok,
      provider: this.provider,
      message: result.message,
      latencyMs: result.latencyMs,
    };
  }

  async pushRoommateGroups(schoolId: string, pairingIds?: string[]): Promise<PushResult> {
    const client = await this.getClient();
    const exportData = await buildStarRezExport(schoolId);
    const db = createAdminClient();

    // Group rows by groupId
    const groupsMap = new Map<string, { name: string; term: string; members: { studentId: string; email: string; isLeader: boolean }[] }>();

    for (const row of exportData.rows) {
      if (pairingIds && !pairingIds.includes(row.groupId)) continue;
      if (!groupsMap.has(row.groupId)) {
        groupsMap.set(row.groupId, {
          name: row.groupName,
          term: row.term,
          members: [],
        });
      }
      groupsMap.get(row.groupId)!.members.push({
        studentId: row.studentId || row.email,
        email: row.email,
        isLeader: row.groupLeader === "Y",
      });
    }

    let recordsPushed = 0;
    const errors: { id: string; error: string }[] = [];

    for (const [groupId, group] of groupsMap.entries()) {
      try {
        const payload: StarRezGroupPayload = {
          groupName: group.name,
          termCode: group.term,
          members: group.members,
        };
        await client.pushGroup(payload);
        recordsPushed++;
      } catch (err: unknown) {
        errors.push({
          id: groupId,
          error: err instanceof Error ? err.message : "Failed to push group to StarRez",
        });
      }
    }

    // Log the integration run
    await db.from("integration_runs").insert({
      school_id: schoolId,
      provider: "starrez",
      action: "push_roommate_groups",
      status: errors.length === 0 ? "success" : recordsPushed > 0 ? "partial_failure" : "failed",
      records_processed: recordsPushed,
      errors: errors as unknown as Json,
    });

    return {
      success: errors.length === 0,
      recordsPushed,
      errors,
    };
  }

  async pullAssignments(schoolId: string, since?: Date): Promise<HousingAssignment[]> {
    const client = await this.getClient();
    const rawAssignments = await client.getAssignments(since);
    const db = createAdminClient();

    const assignments: HousingAssignment[] = rawAssignments.map((raw) => ({
      studentId: raw.EntryID,
      building: raw.BuildingCode,
      room: raw.RoomSpaceDescription,
      bed: raw.BedDescription,
      term: raw.TermCode,
      movedInAt: raw.CheckInDate,
    }));

    // Log the run
    await db.from("integration_runs").insert({
      school_id: schoolId,
      provider: "starrez",
      action: "pull_assignments",
      status: "success",
      records_processed: assignments.length,
      errors: [] as unknown as Json,
    });

    return assignments;
  }

  async pullRoomChanges(schoolId: string, since?: Date): Promise<HousingRoomChange[]> {
    const client = await this.getClient();
    const rawChanges = await client.getRoomChanges(since);
    const db = createAdminClient();

    const roomChanges: HousingRoomChange[] = rawChanges.map((raw) => ({
      studentId: raw.EntryID,
      building: raw.CurrentBuilding,
      room: raw.CurrentRoom,
      reason: raw.ReasonDescription,
      requestedAt: raw.DateCreated,
      status: raw.Status.toLowerCase() as HousingRoomChange["status"],
    }));

    await db.from("integration_runs").insert({
      school_id: schoolId,
      provider: "starrez",
      action: "pull_room_changes",
      status: "success",
      records_processed: roomChanges.length,
      errors: [] as unknown as Json,
    });

    return roomChanges;
  }
}

/**
 * Adapter factory for housing integrations.
 */
export function getHousingAdapter(schoolId: string, provider: "starrez" | "entrata" | "yardi" = "starrez"): HousingSystemAdapter {
  switch (provider) {
    case "starrez":
      return new StarRezRestAdapter(schoolId);
    case "entrata":
      return new EntrataStubAdapter();
    case "yardi":
      return new YardiStubAdapter();
    default:
      throw new Error(`Unsupported housing provider: ${provider}`);
  }
}
