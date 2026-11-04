import type { Messages } from "../en";
import { shell } from "./shell";
import { settings } from "./settings";
import { auth } from "./auth";
import { errors } from "./errors";

/** Spanish: complete for student flows. The type makes a missing key a compile error. */
export const es: Messages = {
  shell,
  settings,
  auth,
  errors,
};
