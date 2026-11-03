import { NotConfiguredError, type ConnectionStatus, type HousingAssignment, type HousingRoomChange, type HousingSystemAdapter, type PushResult } from "./adapter";

/**
 * Off-campus partner systems (Phase 2e): interface only. Rumi has no verified API docs or
 * credentials for these, so every call throws NotConfiguredError and the UI says "Contact us".
 */
class PartnerStub implements HousingSystemAdapter {
  constructor(readonly provider: "entrata" | "yardi") {}
  async testConnection(): Promise<ConnectionStatus> {
    return { ok: false, provider: this.provider, message: new NotConfiguredError(this.provider).message };
  }
  async pushRoommateGroups(): Promise<PushResult> {
    throw new NotConfiguredError(this.provider);
  }
  async pullAssignments(): Promise<HousingAssignment[]> {
    throw new NotConfiguredError(this.provider);
  }
  async pullRoomChanges(): Promise<HousingRoomChange[]> {
    throw new NotConfiguredError(this.provider);
  }
}

export const EntrataStubAdapter = () => new PartnerStub("entrata");
export const YardiStubAdapter = () => new PartnerStub("yardi");

export const PARTNER_SYSTEMS = [
  { provider: "entrata", label: "Entrata", note: "Off-campus apartment partners" },
  { provider: "yardi", label: "Yardi", note: "Off-campus apartment partners" },
] as const;
