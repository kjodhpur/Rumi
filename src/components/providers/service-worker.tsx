"use client";

import * as React from "react";

/** Registers the service worker in production; clears stale ones during development. */
export function ServiceWorker() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => void reg.unregister()));
      return;
    }
    const register = () => void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
