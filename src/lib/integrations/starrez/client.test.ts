import { describe, it, expect } from "vitest";
import { StarRezClient, TokenBucket } from "./client";
import { RateLimitExceededError } from "../housing/adapter";

describe("TokenBucket", () => {
  it("allows acquiring tokens up to capacity", async () => {
    const bucket = new TokenBucket(10, 10);
    expect(bucket.getAvailableTokens()).toBe(10);
    await bucket.acquire(5);
    expect(bucket.getAvailableTokens()).toBe(5);
  });

  it("throws RateLimitExceededError if deficit requires waiting longer than maxWaitMs", async () => {
    // 1 token capacity, 0.1 tokens/sec refill rate -> 2 tokens needs 10s wait
    const bucket = new TokenBucket(1, 0.1);
    await bucket.acquire(1);

    await expect(bucket.acquire(2, 50)).rejects.toThrow(RateLimitExceededError);
  });
});

describe("StarRezClient mock mode", () => {
  const client = new StarRezClient("https://starrez.asu.edu/services/mock", { apiKey: "mock_test_key" }, { isMock: true });

  it("returns healthy connection in mock mode", async () => {
    const result = await client.testConnection();
    expect(result.ok).toBe(true);
    expect(result.message).toContain("Connected to StarRez");
  });

  it("successfully pushes a roommate group in mock mode", async () => {
    const res = await client.pushGroup({
      groupName: "Tooker Hall Roommates",
      termCode: "FALL-2026",
      members: [
        { studentId: "1223334444", email: "student1@asu.edu", isLeader: true },
        { studentId: "1223334445", email: "student2@asu.edu", isLeader: false },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.groupId).toMatch(/^SR-GRP-\d+/);
  });

  it("pulls simulated assignments in mock mode", async () => {
    const assignments = await client.getAssignments();
    expect(assignments.length).toBeGreaterThan(0);
    expect(assignments[0].BuildingCode).toBe("TOOKER");
    expect(assignments[0].RoomSpaceDescription).toBe("A301");
  });

  it("pulls simulated room changes in mock mode", async () => {
    const changes = await client.getRoomChanges();
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0].Status).toBe("Pending");
  });

  it("pulls simulated questionnaire answers in mock mode", async () => {
    const answers = await client.getQuestionnaireAnswers();
    expect(answers.length).toBeGreaterThan(0);
    expect(answers[0].QuestionCode).toBe("CLEANLINESS");
  });
});
