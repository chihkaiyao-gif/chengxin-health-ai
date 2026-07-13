"use client";

const cachePrefix = "chengxin-health-ai";

export async function purgeAppCaches() {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.controller?.postMessage({ type: "PURGE_APP_CACHE" });
    const registration = await navigator.serviceWorker.ready.catch(() => null);
    registration?.active?.postMessage({ type: "PURGE_APP_CACHE" });
  }

  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(cachePrefix))
        .map((key) => caches.delete(key)),
    );
  }
}
