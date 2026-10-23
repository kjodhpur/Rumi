import { expect, test } from "@playwright/test";
import { createStudent, deleteUsers, ready, recomputeScores, signIn, type Student } from "./support";

let ana: Student;
let bea: Student;
test.beforeAll(async () => {
  ana = await createStudent("Ana");
  bea = await createStudent("Bea");
  await recomputeScores();
});
test.afterAll(async () => deleteUsers([ana.email, bea.email]));

test("intro → accept → realtime chat with typing and read receipts", async ({ browser }) => {
  const anaContext = await browser.newContext({ reducedMotion: "reduce" });
  const beaContext = await browser.newContext({ reducedMotion: "reduce" });
  const a = await anaContext.newPage();
  const b = await beaContext.newPage();
  await signIn(a, ana.email);
  await signIn(b, bea.email);

  // Ana sends an intro from Bea's profile.
  await a.goto(`/profile/${bea.id}`);
  await ready(a);
  await a.getByRole("button", { name: "Send intro" }).first().click();
  await a.getByLabel(`Intro message to ${bea.firstName}`).fill("Hi Bea! We both want Tempe and a quiet place — want to talk apartments?");
  await a.getByRole("dialog").getByRole("button", { name: "Send intro" }).click();
  await expect(a.getByText(`Intro sent to ${bea.firstName}`)).toBeVisible();

  // Bea accepts from Requests and lands in the new chat.
  await b.goto("/messages");
  await ready(b);
  await b.getByRole("tab", { name: /Requests/ }).click();
  await expect(b.getByText("want to talk apartments?")).toBeVisible();
  await b.getByRole("button", { name: "Accept & chat" }).click();
  await expect(b).toHaveURL(/\/messages\/[0-9a-f-]{36}/);
  const thread = b.url();

  await a.goto(thread);
  await ready(a);
  await expect(a.getByRole("textbox", { name: /Message/ })).toBeVisible();

  // Typing shows up live on the other side.
  await b.getByRole("textbox", { name: /Message/ }).pressSequentially("Yes! Saturday works", { delay: 40 });
  await expect(a.getByText(/^typing/)).toBeVisible();

  // Messages arrive in real time; reading them sends a receipt back.
  await b.keyboard.press("Enter");
  await expect(a.getByText("Yes! Saturday works")).toBeVisible();
  await expect(b.getByText("Seen", { exact: true })).toBeVisible({ timeout: 20_000 });

  await a.getByRole("textbox", { name: /Message/ }).fill("Perfect — 11am at the Apache place?");
  await a.getByRole("button", { name: "Send message" }).click();
  await expect(b.getByText("Perfect — 11am at the Apache place?")).toBeVisible();

  await anaContext.close();
  await beaContext.close();
});
