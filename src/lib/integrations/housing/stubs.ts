import {
  HousingSystemAdapter,
  ConnectionStatus,
  HousingAssignment,
  HousingRoomChange,
  PushResult,
  NotConfiguredError,
} from "./adapter";

/**
 * Entrata adapter stub for off-campus housing partners.
 * Master Prompt §2e: Interface only; throws NotConfiguredError without live credentials.
 */
export class EntrataStubAdapter implements HousingSystemAdapter {
  provider = "entrata";

  async testConnection(): Promise<ConnectionStatus> {
    return {
      ok: false,
      provider: this.provider,
      message: "Entrata integration is available for off-campus housing partners. Contact Rumi support to configure API keys.",
    };
  }

  async pushRoommateGroups(_schoolId: string, _pairingIds?: string[]): Promise<PushResult> {
    throw new NotConfiguredError(this.provider);
  }

  async pullAssignments(_schoolId: string, _since?: Date): Promise<HousingAssignment[]> {
    throw new NotConfiguredError(this.provider);
  }

  async pullRoomChanges(_schoolId: string, _since?: Date): Promise<HousingRoomChange[]> {
    throw new NotConfiguredError(this.provider);
  }
}

/**
 * Yardi adapter stub for off-campus housing partners.
 * Master Prompt §2e: Interface only; throws NotConfiguredError without live credentials.
 */
export class YardiStubAdapter implements HousingSystemAdapter {
  provider = "yardi";

  async testConnection(): Promise<ConnectionStatus> {
    return {
      ok: false,
      provider: this.provider,
      message: "Yardi Voyager integration is available for off-campus housing partners. Contact Rumi support to configure Voyager API credentials.",
    };
  }

  async pushRoommateGroups(_schoolId: string, _pairingIds?: string[]): Promise<PushResult> {
    throw new NotConfiguredError(this.provider);
  }

  async pullAssignments(_schoolId: string, _since?: Date): Promise<HousingAssignment[]> {
    throw new NotConfiguredError(this.provider);
  }

  async pullRoomChanges(_schoolId: string, _since?: Date): Promise<HousingRoomChange[]> {
    throw new NotConfiguredError(this.provider);
  }
}
