const CACHE_PREFIX = "chengxin-health-ai";
const STATIC_CACHE = `${CACHE_PREFIX}-static-v8`;
const PAGE_CACHE = `${CACHE_PREFIX}-pages-v8`;
const OFFLINE_URL = "/offline.html";

const STATIC_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

const CACHEABLE_PAGES = [
  "/dashboard",
  "/appointments",
  "/training",
  "/nutrition",
  "/inbody",
  "/medications",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          cache.add(new Request(asset, { cache: "reload" })),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX))
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || shouldBypassCache(url)) {
    return;
  }

  if (isStaticRequest(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request, url));
  }
});

function shouldBypassCache(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.includes("supabase") ||
    url.searchParams.has("code") ||
    url.searchParams.has("token")
  );
}

function isStaticRequest(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    STATIC_ASSETS.includes(url.pathname)
  );
}

function isCacheablePage(url) {
  return CACHEABLE_PAGES.includes(url.pathname);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstPage(request, url) {
  try {
    const response = await fetch(request);

    if (
      response.ok &&
      response.type === "basic" &&
      isCacheablePage(url) &&
      isHtmlResponse(response)
    ) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cachedPage = isCacheablePage(url)
      ? await caches.match(request)
      : null;
    const offlineFallback = await caches.match(OFFLINE_URL);

    return cachedPage || offlineFallback || Response.error();
  }
}

function isHtmlResponse(response) {
  return (response.headers.get("content-type") || "").includes("text/html");
}
