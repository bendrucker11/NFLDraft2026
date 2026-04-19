"use client";

import { useEffect } from "react";

/**
 * When an admin tab is closing or navigating away in a full unload, clears the admin cookie
 * via a keepalive request (httpOnly cookies cannot be cleared from JS).
 * Skips when the page enters the back/forward cache (persisted) so a restored tab stays signed in.
 */
export function AdminSessionTeardown() {
  useEffect(() => {
    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;
      void fetch("/api/admin/logout", {
        method: "POST",
        keepalive: true,
        credentials: "same-origin",
      });
    };

    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return null;
}
