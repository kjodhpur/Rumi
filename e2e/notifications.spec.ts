import { expect, test } from "@playwright/test";
import { admin, createStudent, deleteUsers, expectAccessible, ready, signIn } from "./support";

/** §5: notification preferences by type and channel persist. */
const created: string[] = [];
test.afterAll(async () => deleteUsers(created));

test("a student turns a channel off for one kind of notification and it sticks", async ({
  page,
}) => {
  const student = await createStudent("Noor");
  created.push(student.email);
  await signIn(page, student.email);
  await page.goto("/settings/notifications");
  await ready(page);
  await expect(
    page.getByRole("table", { name: "Notification preferences by type and channel" }),
  ).toBeVisible();
  await expectAccessible(page);

  const introsEmail = page.getByRole("checkbox", { name: "Intros: Email" });
  await expect(introsEmail).toBeChecked();
  await introsEmail.click();
  await expect(introsEmail).not.toBeChecked();
  // The other channels and kinds are untouched.
  await expect(page.getByRole("checkbox", { name: "Intros: In app" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Messages: Email" })).toBeChecked();

  await expect
    .poll(async () => {
      const { data } = await admin
        .from("notification_preferences")
        .select("email")
        .eq("user_id", student.id)
        .eq("kind", "intros")
        .maybeSingle();
      return data?.email;
    })
    .toBe(false);
  await page.reload();
  await ready(page);
  await expect(page.getByRole("checkbox", { name: "Intros: Email" })).not.toBeChecked();
});
