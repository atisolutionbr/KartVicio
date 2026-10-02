"use client";
import { useEffect } from "react";
import { appUrl } from "@/lib/app-url";

/** Registers the PWA silently. Installation remains available in the browser menu. */
export function PwaControls() {
  useEffect(() => {
    document.documentElement.style.setProperty("--app-scale", "0.7");
    if ("serviceWorker" in navigator) void (async () => {
      const scope = appUrl("") || "/";
      if (scope !== "/") {
        const previous = await navigator.serviceWorker.getRegistration(appUrl("/"));
        if (previous && new URL(previous.scope).pathname === appUrl("/") && previous.active?.scriptURL === location.origin + appUrl("/sw.js")) await previous.unregister();
      }
      await navigator.serviceWorker.register(appUrl("/sw.js"), { scope, updateViaCache: "none" });
    })().catch(() => {});
  }, []);
  return null;
}
