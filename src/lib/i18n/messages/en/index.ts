import { shell } from "./shell";
import { settings } from "./settings";

/** English: the source of truth. Every other complete locale must match these keys. */
export const en = {
  shell,
  settings,
};

export type Messages = typeof en;
