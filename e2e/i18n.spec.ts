import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { admin, deleteUsers, otpFor, ready, uniqueEmail } from "./support";

/** Phase 8: a student picks Spanish before signing in and onboards in Spanish. */
const created: string[] = [];
test.afterAll(async () => deleteUsers(created));
test.use({ reducedMotion: "reduce" });

const next = (page: Page) =>
  page
    .getByRole("button", { name: /^(Continuar|Terminar y ver compatibles)$/ })
    .last()
    .click();

test("Spanish onboarding: login, wizard, validation messages and finish", async ({ page }) => {
  const email = uniqueEmail("es-onboard");
  created.push(email);
  await admin.from("rate_limits").delete().like("key", "otp:%");

  await page.goto("/login");
  await ready(page);
  await page.getByLabel("Language").selectOption("es");
  await expect(page.getByRole("heading", { name: "Encuentra a tu gente." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  const since = Date.now() - 2000;
  await page.getByLabel("Correo escolar").fill(email);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByText("Revisa tu correo.")).toBeVisible();
  await page.getByLabel("Código de 6 dígitos").fill(await otpFor(email, since));
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
  await ready(page);

  // The language picked before sign-in is saved to the new account.
  const { data: settings } = await admin
    .from("user_settings")
    .select("locale")
    .eq("email", email)
    .single();
  expect(settings?.locale).toBe("es");

  await expect(page.getByRole("heading", { name: "Empecemos por lo básico." })).toBeVisible();
  // Client-side validation answers in Spanish.
  await next(page);
  await expect(page.getByText("Agrega tu nombre.")).toBeVisible();
  await page.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await page.getByLabel("Apellido").fill("Prueba");
  await page.getByRole("radio", { name: "Mujer" }).click();
  await page.getByRole("radio", { name: "Tercer año" }).click();
  await page.getByLabel("Carrera").fill("Enfermería");
  await next(page);

  const photos = page.getByText("Agrega algunas fotos.");
  const campus = page.getByText("Dónde vas a estar en el campus.");
  await expect(photos.or(campus)).toBeVisible();
  if (await campus.isVisible()) {
    await expect(page.getByText("¿Te interesa la vivienda inclusiva de género?")).toBeVisible();
    await next(page);
  }
  await expect(photos).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Agregar una foto" }).first().click();
  await (await chooser).setFiles(path.join(__dirname, "fixtures", "portrait.jpg"));
  await expect(page.getByText("Recorta tu foto")).toBeVisible();
  await page.getByRole("button", { name: "Usar foto" }).click();
  await expect(page.getByAltText("Tu foto de portada")).toBeVisible({ timeout: 20_000 });
  await next(page);

  await expect(page.getByText("Preséntate.")).toBeVisible();
  await page
    .getByLabel("Tu biografía")
    .fill("Estudiante de enfermería, me levanto temprano y mantengo ordenadas las áreas comunes.");
  await next(page);

  await expect(page.getByText("¿Qué estás buscando?")).toBeVisible();
  await page.getByLabel("Fecha ideal de mudanza").fill("2027-08-10");
  await next(page);

  await expect(page.getByText("¿Dónde quieres vivir?")).toBeVisible();
  await page.getByRole("button", { name: /Tempe — near campus/ }).click();
  await next(page);

  await expect(page.getByText("¿Cómo vives en el día a día?")).toBeVisible();
  await expect(page.getByText("Horario de sueño")).toBeVisible();
  await next(page);
  await expect(page.getByText("Algunos hábitos.")).toBeVisible();
  await next(page);
  await expect(page.getByText("¿Qué es lo más importante?")).toBeVisible();
  await next(page);
  await expect(page.getByText("¿Algo que no negocias?")).toBeVisible();
  await next(page);

  const music = page.getByText("Trae tu música.");
  const sharing = page.getByRole("heading", { name: /^¿Compartir con / });
  const finish = page.getByRole("button", { name: "Ver mis compatibles" });
  await expect(music.or(sharing).or(finish)).toBeVisible({ timeout: 20_000 });
  if (await music.isVisible()) {
    await next(page);
    await expect(sharing.or(finish)).toBeVisible({ timeout: 20_000 });
  }
  if (await sharing.isVisible()) await next(page);
  await finish.click();
  await expect(page).toHaveURL(/\/matches/);
  await ready(page);
  await expect(page.getByRole("link", { name: "Mensajes" }).first()).toBeVisible();
});
