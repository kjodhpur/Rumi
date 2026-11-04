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
import { profile } from "./profile";
import { starters } from "./starters";
import { chat } from "./chat";
import { notifications } from "./notifications";
import { email } from "./email";
import { accounts } from "./accounts";
import { privacy } from "./privacy";

/** English: the source of truth. Every other complete locale must match these keys. */
export const en = {
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
  profile,
  starters,
  chat,
  notifications,
  email,
  accounts,
  privacy,
};

export type Messages = typeof en;
