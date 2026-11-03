/**
 * Provider-agnostic Housing System Adapter interface.
 * Implemented by StarRez (REST and CSV) and stubbed for future off-campus providers (Entrata, Yardi).
 */

export interface HousingAssignment {
  userId?: string;
  studentId: string;
  building: string;
  room?: string;
  bed?: string;
  term: string;
  movedInAt: string;
}

export interface HousingRoomChange {
  userId?: string;
  studentId: string;
  building: string;
  room?: string;
  reason?: string;
  requestedAt: string;
  status: "pending" | "approved" | "completed" | "cancelled";
}

export interface HousingQuestionnaireAnswer {
  externalStudentId: string;
  email?: string;
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
    super(`Provider ${provider} is not configured. Contact us to enable this integration.`);
    this.name = "NotConfiguredError";
  }
}

export class RateLimitExceededError extends Error {
  constructor(public retryAfterSeconds: number = 60) {
    super(`Housing system rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`);
    this.name = "RateLimitExceededError";
  }
}

export class AuthenticationError extends Error {
  constructor(public provider: string, details?: string) {
    super(`Authentication failed for ${provider}${details ? `: ${details}` : ""}`);
    this.name = "AuthenticationError";
  }
}

export interface HousingSystemAdapter {
  provider: string;
  testConnection(): Promise<ConnectionStatus>;
  pushRoommateGroups(schoolId: string, pairingIds?: string[]): Promise<PushResult>;
  pullAssignments(schoolId: string, since?: Date): Promise<HousingAssignment[]>;
  pullRoomChanges(schoolId: string, since?: Date): Promise<HousingRoomChange[]>;
}
