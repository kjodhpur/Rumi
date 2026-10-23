"use client";

import * as React from "react";
import { toast } from "sonner";

/** After account deletion we land on `/?deleted=1` — confirm it, then tidy the URL. */
export function DeletedNotice() {
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("deleted") !== "1") return;
    toast("Your account was deleted", { id: "deleted", description: "Everything you stored on Rumi is gone. Take care!" });
    url.searchParams.delete("deleted");
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return null;
}
