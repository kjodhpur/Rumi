"use client";

import * as React from "react";

/**
 * The landing page is static, so it can't ask the server who's signed in.
 * Supabase keeps a readable session cookie; if it's there, CTAs open the app.
 */
export function useHasSession() {
  const [signedIn, setSignedIn] = React.useState(false);
  React.useEffect(() => {
    setSignedIn(/(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/.test(document.cookie));
  }, []);
  return signedIn;
}
