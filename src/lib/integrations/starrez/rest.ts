import { NotConfiguredError, RateLimitExceededError, type ConnectionStatus, type HousingAssignment, type HousingQuestionnaireAnswer, type HousingRoomChange, type HousingSystemAdapter, type PushResult, type RoommateGroup } from "../housing/adapter";

/**
 * StarRez REST adapter (Phase 2b). The exact StarRez endpoints and field names depend on the
 * school's StarRez REST license and configuration, so both are settings, not code: confirm
 * them against the school's StarRez REST documentation. Tested against a mock server (msw).
 */

export interface StarRezEndpoints {
  health: string;
  roommateGroups: string;
  assignments: string;
  roomChanges: string;
  questionnaire: string;
}

/** Placeholders until the school's StarRez docs confirm them. */
export const DEFAULT_STARREZ_ENDPOINTS: StarRezEndpoints = {
  health: "/services/health",
  roommateGroups: "/services/roommategroups",
  assignments: "/services/assignments",
  roomChanges: "/services/roomchanges",
  questionnaire: "/services/roommateprofiles",
};

/** Rumi field → StarRez JSON field. */
export interface StarRezFields {
  studentId: string;
  email: string;
  building: string;
  room: string;
  bed: string;
  term: string;
  movedIn: string;
  requestedAt: string;
  reason: string;
  status: string;
  questionCode: string;
  answer: string;
}

export const DEFAULT_STARREZ_FIELDS: StarRezFields = {
  studentId: "EntryID",
  email: "Email",
  building: "RoomLocation",
  room: "RoomSpace",
  bed: "Bed",
  term: "TermCode",
  movedIn: "CheckInDate",
  requestedAt: "DateCreated",
  reason: "ReasonDescription",
  status: "Status",
  questionCode: "QuestionCode",
  answer: "AnswerText",
};

export interface StarRezConfig {
  baseUrl: string;
  username: string;
  password: string;
  endpoints?: Partial<StarRezEndpoints>;
  fields?: Partial<StarRezFields>;
}

/** Token bucket: StarRez documents roughly 100 calls per 60 seconds. */
export class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(
    private readonly capacity = 100,
    private readonly perSecond = 100 / 60,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.last = now();
  }
  private refill() {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.perSecond);
    this.last = t;
  }
  /** Waits for a token, or throws when the wait would exceed `maxWaitMs`. */
  async take(maxWaitMs = 5_000) {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    const wait = ((1 - this.tokens) / this.perSecond) * 1000;
    if (wait > maxWaitMs) throw new RateLimitExceededError(Math.ceil(wait / 1000));
    await new Promise((r) => setTimeout(r, wait));
    this.refill();
    this.tokens = Math.max(0, this.tokens - 1);
  }
  available() {
    this.refill();
    return Math.floor(this.tokens);
  }
}

export class StarRezHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "StarRezHttpError";
  }
}

export class StarRezRestAdapter implements HousingSystemAdapter {
  readonly provider = "starrez";
  /** Calls made, for the run log. */
  calls = 0;
  private readonly endpoints: StarRezEndpoints;
  private readonly fields: StarRezFields;
  private readonly bucket: TokenBucket;
  private readonly retries: number;
  private readonly backoffMs: number;

  constructor(
    private readonly config: StarRezConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    options: { bucket?: TokenBucket; retries?: number; backoffMs?: number } = {},
  ) {
    if (!/^https:\/\//i.test(config.baseUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(config.baseUrl)) throw new NotConfiguredError("starrez");
    this.endpoints = { ...DEFAULT_STARREZ_ENDPOINTS, ...config.endpoints };
    this.fields = { ...DEFAULT_STARREZ_FIELDS, ...config.fields };
    this.bucket = options.bucket ?? new TokenBucket();
    this.retries = options.retries ?? 3;
    this.backoffMs = options.backoffMs ?? 400;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.config.baseUrl.replace(/\/$/, "")}${path}`;
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString("base64");
    let lastError: unknown = null;
    for (let attempt = 0; attempt < this.retries; attempt++) {
      await this.bucket.take();
      this.calls += 1;
      try {
        const res = await this.fetchImpl(url, {
          ...init,
          headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Basic ${auth}`, ...init.headers },
          signal: AbortSignal.timeout(15_000),
        });
        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number(res.headers.get("Retry-After"));
          lastError = new StarRezHttpError(res.status, `StarRez answered ${res.status}`);
          await new Promise((r) => setTimeout(r, Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter, 10) * 1000 : this.backoffMs * 2 ** attempt));
          continue;
        }
        if (res.status === 401 || res.status === 403) throw new StarRezHttpError(res.status, "StarRez rejected the credentials.");
        if (!res.ok) throw new StarRezHttpError(res.status, `StarRez answered ${res.status}`);
        return (await res.json()) as T;
      } catch (error) {
        if (error instanceof StarRezHttpError && error.status < 500 && error.status !== 429) throw error;
        lastError = error;
        if (attempt < this.retries - 1) await new Promise((r) => setTimeout(r, this.backoffMs * 2 ** attempt));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("StarRez request failed.");
  }

  private since(path: string, since?: Date) {
    return since ? `${path}${path.includes("?") ? "&" : "?"}since=${encodeURIComponent(since.toISOString())}` : path;
  }

  private str(row: Record<string, unknown>, key: keyof StarRezFields) {
    const v = row[this.fields[key]];
    return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
  }

  async testConnection(): Promise<ConnectionStatus> {
    const started = Date.now();
    try {
      await this.request(this.endpoints.health);
      return { ok: true, provider: this.provider, message: "Connected to StarRez.", latencyMs: Date.now() - started };
    } catch (error) {
      return { ok: false, provider: this.provider, message: error instanceof Error ? error.message : "Couldn't reach StarRez.", latencyMs: Date.now() - started };
    }
  }

  /** One call per group; a failure is recorded and the rest continue (partial failure). */
  async pushRoommateGroups(groups: RoommateGroup[]): Promise<PushResult> {
    const result: PushResult = { success: true, recordsPushed: 0, errors: [] };
    for (const g of groups) {
      try {
        await this.request(this.endpoints.roommateGroups, {
          method: "POST",
          body: JSON.stringify({
            GroupName: g.name,
            [this.fields.term]: g.term,
            Members: g.members.map((m) => ({ [this.fields.studentId]: m.studentId ?? "", [this.fields.email]: m.email, IsLeader: m.leader })),
            ExternalReference: g.ref,
          }),
        });
        result.recordsPushed += 1;
      } catch (error) {
        result.success = false;
        result.errors.push({ id: g.ref, error: error instanceof Error ? error.message : "Failed" });
      }
    }
    return result;
  }

  async pullAssignments(since?: Date): Promise<HousingAssignment[]> {
    const rows = await this.request<Record<string, unknown>[]>(this.since(this.endpoints.assignments, since));
    if (!Array.isArray(rows)) throw new Error("StarRez returned something other than a list of assignments.");
    return rows.map((r) => ({
      studentId: this.str(r, "studentId") || null,
      email: this.str(r, "email").toLowerCase() || null,
      building: this.str(r, "building"),
      room: this.str(r, "room") || null,
      bed: this.str(r, "bed") || null,
      term: this.str(r, "term") || null,
      movedIn: this.str(r, "movedIn").slice(0, 10) || null,
    }));
  }

  async pullRoomChanges(since?: Date): Promise<HousingRoomChange[]> {
    const rows = await this.request<Record<string, unknown>[]>(this.since(this.endpoints.roomChanges, since));
    if (!Array.isArray(rows)) throw new Error("StarRez returned something other than a list of room changes.");
    return rows.map((r) => ({
      studentId: this.str(r, "studentId") || null,
      email: this.str(r, "email").toLowerCase() || null,
      building: this.str(r, "building") || null,
      requestedAt: this.str(r, "requestedAt") || new Date().toISOString(),
      reason: this.str(r, "reason") || null,
      externalRef: `${this.str(r, "studentId") || this.str(r, "email")}@${this.str(r, "requestedAt")}`,
    }));
  }

  async pullQuestionnaire(since?: Date): Promise<HousingQuestionnaireAnswer[]> {
    const rows = await this.request<Record<string, unknown>[]>(this.since(this.endpoints.questionnaire, since));
    if (!Array.isArray(rows)) throw new Error("StarRez returned something other than a list of answers.");
    return rows.map((r) => ({ studentId: this.str(r, "studentId") || null, email: this.str(r, "email").toLowerCase() || null, questionCode: this.str(r, "questionCode"), rawValue: this.str(r, "answer") }));
  }
}
