import { redirect } from "next/navigation";

/** v2: /me merges into Settings (+ public /profile/[self]). */
export default function MeRedirectPage() {
  redirect("/settings");
}
