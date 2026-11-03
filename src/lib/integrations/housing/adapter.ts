/**
 * Provider-agnostic housing-system adapter (Phase 2b, 2e). Implementations: StarRez REST,
 * CSV (file in, file out), and interface-only stubs for off-campus partners.
 */

export interface RoommateGroup {
  /** Our pairing id, sent as the external reference so a re-push updates, not duplicates. */
  ref: string;
  name: string;
  term: string;
  members: { studentId: string | null; email: string; leader: boolean }[];
}

export interface HousingAssignment {
  studentId: string | null;
  email: string | null;
  building: string;
  room: string | null;
  bed: string | null;
  term: string | null;
  movedIn: string | null;
}

export interface HousingRoomChange {
  studentId: string | null;
  email: string | null;
  building: string | null;
  requestedAt: string;
  reason: string | null;
  /** Stable id from the source system, so re-pulling doesn't duplicate. */
  externalRef: string;
}

export interface HousingQuestionnaireAnswer {
  studentId: string | null;
  email: string | null;
  questionCode: string;
  rawValue: string;
}

export interface PushResult {
  success: boolean;
  recordsPushed: number;
  errors: { id: string; error: string }[];
}

export interface ConnectionStatus {
  ok: boolean;
  provider: string;
  message: string;
  latencyMs?: number;
}

export class NotConfiguredError extends Error {
  constructor(public provider: string) {
    super(`${provider} isn't set up for this school. Contact Rumi to talk about it.`);
    this.name = "NotConfiguredError";
  }
}

export class RateLimitExceededError extends Error {
  constructor(public retryAfterSeconds = 60) {
    super(`The housing system's rate limit was reached. Try again in ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitExceededError";
  }
}

export interface HousingSystemAdapter {
  provider: string;
  testConnection(): Promise<ConnectionStatus>;
  pushRoommateGroups(groups: RoommateGroup[]): Promise<PushResult>;
  pullAssignments(since?: Date): Promise<HousingAssignment[]>;
  pullRoomChanges(since?: Date): Promise<HousingRoomChange[]>;
}
