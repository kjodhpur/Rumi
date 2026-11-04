import { shell } from "./shell";
import { settings } from "./settings";
import { auth } from "./auth";
import { errors } from "./errors";

/** English: the source of truth. Every other complete locale must match these keys. */
export const en = {
  shell,
  settings,
  auth,
  errors,
};

export type Messages = typeof en;
