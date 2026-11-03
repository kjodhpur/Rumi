import { RateLimitExceededError } from "../housing/adapter";

export interface StarRezCredentials {
  apiKey: string;
  clientSecret?: string;
  username?: string;
}

export interface StarRezGroupMember {
  studentId: string;
  email: string;
  isLeader: boolean;
}

export interface StarRezGroupPayload {
  groupName: string;
  termCode: string;
  members: StarRezGroupMember[];
}

export interface StarRezAssignmentPayload {
  EntryID: string;
  Email: string;
  BuildingCode: string;
  RoomSpaceDescription: string;
  BedDescription?: string;
  TermCode: string;
  CheckInDate: string;
}

export interface StarRezRoomChangePayload {
  EntryID: string;
  Email: string;
  CurrentBuilding: string;
  CurrentRoom: string;
  ReasonDescription: string;
  Status: "Pending" | "Approved" | "Completed" | "Cancelled";
  DateCreated: string;
}

export interface StarRezQuestionnairePayload {
  EntryID: string;
  Email: string;
  QuestionCode: string;
  AnswerText: string;
}

/**
 * Token Bucket rate limiter for StarRez REST API (~100 requests per 60 seconds).
 */
export class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;

  constructor(
    private capacity: number = 100,
    private refillRatePerSecond: number = 100 / 60
  ) {
    this.tokens = capacity;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillRatePerSecond);
    this.lastRefillTime = now;
  }

  async acquire(tokens: number = 1, maxWaitMs: number = 2000): Promise<void> {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return;
    }

    const deficit = tokens - this.tokens;
    const waitMs = (deficit / this.refillRatePerSecond) * 1000;
    if (waitMs > maxWaitMs) {
      throw new RateLimitExceededError(Math.ceil(waitMs / 1000));
    }

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens = Math.max(0, this.tokens - tokens);
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * StarRez REST client adapter with rate limiting, retry backoff, and mock simulation mode.
 */
export class StarRezClient {
  private tokenBucket: TokenBucket;
  public isMock: boolean;

  constructor(
    public baseUrl: string = "https://starrez.asu.edu/services",
    private credentials: StarRezCredentials = { apiKey: "mock_api_key" },
    options: { isMock?: boolean; capacity?: number } = {}
  ) {
    this.isMock = options.isMock ?? (baseUrl.includes("mock") || credentials.apiKey.startsWith("mock_"));
    this.tokenBucket = new TokenBucket(options.capacity ?? 100);
  }

  /**
   * Internal request handler with token bucket rate limit and backoff retries.
   */
  async request<T>(endpoint: string, options: RequestInit = {}, retries: number = 3): Promise<T> {
    await this.tokenBucket.acquire(1);

    if (this.isMock) {
      return this.mockResponse<T>(endpoint, options);
    }

    let attempt = 0;
    while (attempt < retries) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            "StarRez-Api-Key": this.credentials.apiKey,
            ...(options.headers || {}),
          },
        });

        if (response.status === 429) {
          const retryHeader = response.headers.get("Retry-After");
          const waitMs = retryHeader ? parseInt(retryHeader, 10) * 1000 : Math.pow(2, attempt) * 500;
          await new Promise((r) => setTimeout(r, waitMs));
          attempt++;
          continue;
        }

        if (!response.ok) {
          if (response.status >= 500 && attempt < retries - 1) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 300));
            attempt++;
            continue;
          }
          throw new Error(`StarRez HTTP error ${response.status}: ${await response.text()}`);
        }

        return (await response.json()) as T;
      } catch (err: unknown) {
        if (attempt >= retries - 1) throw err;
        attempt++;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 300));
      }
    }

    throw new Error("StarRez request failed after all retries.");
  }

  /**
   * Simulates StarRez responses for sandbox/test environments without live StarRez REST licensing.
   */
  private async mockResponse<T>(endpoint: string, options: RequestInit): Promise<T> {
    await new Promise((r) => setTimeout(r, 10)); // simulate 10ms network latency

    if (endpoint.includes("/health") || endpoint.includes("/ping")) {
      return { status: "OK", serverTime: new Date().toISOString() } as T;
    }

    if (endpoint.includes("/roommate-groups") && options.method === "POST") {
      const body = JSON.parse((options.body as string) || "{}");
      return {
        success: true,
        groupId: `SR-GRP-${Math.floor(Math.random() * 90000) + 10000}`,
        name: body.groupName || "Roommate Group",
        membersCount: (body.members || []).length,
      } as T;
    }

    if (endpoint.includes("/assignments")) {
      const mockAssignments: StarRezAssignmentPayload[] = [
        {
          EntryID: "1223334444",
          Email: "student1@asu.edu",
          BuildingCode: "TOOKER",
          RoomSpaceDescription: "A301",
          BedDescription: "A",
          TermCode: "FALL-2026",
          CheckInDate: "2026-08-15",
        },
        {
          EntryID: "1223334445",
          Email: "student2@asu.edu",
          BuildingCode: "TOOKER",
          RoomSpaceDescription: "A301",
          BedDescription: "B",
          TermCode: "FALL-2026",
          CheckInDate: "2026-08-15",
        },
      ];
      return mockAssignments as T;
    }

    if (endpoint.includes("/room-changes")) {
      const mockChanges: StarRezRoomChangePayload[] = [
        {
          EntryID: "1223334444",
          Email: "student1@asu.edu",
          CurrentBuilding: "TOOKER",
          CurrentRoom: "A301",
          ReasonDescription: "Noise and sleep schedule friction",
          Status: "Pending",
          DateCreated: new Date().toISOString(),
        },
      ];
      return mockChanges as T;
    }

    if (endpoint.includes("/questionnaire")) {
      const mockAnswers: StarRezQuestionnairePayload[] = [
        { EntryID: "1223334444", Email: "student1@asu.edu", QuestionCode: "CLEANLINESS", AnswerText: "4" },
        { EntryID: "1223334444", Email: "student1@asu.edu", QuestionCode: "SLEEP", AnswerText: "EARLY" },
        { EntryID: "1223334444", Email: "student1@asu.edu", QuestionCode: "GUESTS", AnswerText: "WEEKENDS" },
      ];
      return mockAnswers as T;
    }

    return {} as T;
  }

  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    try {
      await this.request<{ status: string }>("/health");
      return { ok: true, message: "Connected to StarRez REST endpoint", latencyMs: Date.now() - start };
    } catch (err: unknown) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Connection failed",
        latencyMs: Date.now() - start,
      };
    }
  }

  async pushGroup(group: StarRezGroupPayload): Promise<{ success: boolean; groupId: string }> {
    return this.request<{ success: boolean; groupId: string }>("/roommate-groups", {
      method: "POST",
      body: JSON.stringify(group),
    });
  }

  async getAssignments(_since?: Date): Promise<StarRezAssignmentPayload[]> {
    return this.request<StarRezAssignmentPayload[]>("/assignments");
  }

  async getRoomChanges(_since?: Date): Promise<StarRezRoomChangePayload[]> {
    return this.request<StarRezRoomChangePayload[]>("/room-changes");
  }

  async getQuestionnaireAnswers(_since?: Date): Promise<StarRezQuestionnairePayload[]> {
    return this.request<StarRezQuestionnairePayload[]>("/questionnaire");
  }
}
