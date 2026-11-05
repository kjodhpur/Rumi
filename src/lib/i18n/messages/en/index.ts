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
import { settingsPages } from "./settingsPages";
import { safety } from "./safety";
import { share } from "./share";
import { groups } from "./groups";
import { agreement } from "./agreement";
import { room } from "./room";
import { roomCalendar } from "./roomCalendar";
import { checkins } from "./checkins";
import { retention } from "./retention";
import { pages } from "./pages";
import { family } from "./family";

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
  settingsPages,
  safety,
  share,
  groups,
  agreement,
  room,
  roomCalendar,
  checkins,
  retention,
  pages,
  family,
};

export type Messages = typeof en;
