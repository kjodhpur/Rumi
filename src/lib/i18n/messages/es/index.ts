import type { Messages } from "../en";
import { shell } from "./shell";
import { settings } from "./settings";
import { auth } from "./auth";
import { errors } from "./errors";
import { options } from "./options";
import { onboarding } from "./onboarding";
import { consent } from "./consent";
import { scenarios } from "./scenarios";
import { matching } from "./matching";
import { matches } from "./matches";
import { common } from "./common";
import { reasons } from "./reasons";

/** Spanish: complete for student flows. The type makes a missing key a compile error. */
export const es: Messages = {
  shell,
  settings,
  auth,
  errors,
  options,
  onboarding,
  consent,
  scenarios,
  matching,
  matches,
  common,
  reasons,
};
