import assert from "node:assert/strict";
import test from "node:test";
import {
  applySupabaseCookies,
  applySupabaseResponseHeaders,
  type SupabaseCookieToSet,
} from "../src/lib/supabase/cookie-adapter";
import { performSecureSignOut } from "../src/lib/secure-sign-out";

test("Supabase cookie adapter applies every auth cookie chunk", () => {
  const written: Array<Record<string, unknown>> = [];
  const cookies: SupabaseCookieToSet[] = [
    {
      name: "sb-test-auth-token",
      value: "",
      options: { maxAge: 0, path: "/" },
    },
    {
      name: "sb-test-auth-token.0",
      value: "",
      options: { maxAge: 0, path: "/" },
    },
    {
      name: "sb-test-auth-token.1",
      value: "",
      options: { maxAge: 0, path: "/" },
    },
  ];

  applySupabaseCookies(
    {
      set(cookie) {
        written.push(cookie);
      },
    },
    cookies,
  );

  assert.deepEqual(
    written.map((cookie) => cookie.name),
    ["sb-test-auth-token", "sb-test-auth-token.0", "sb-test-auth-token.1"],
  );
  assert.ok(written.every((cookie) => cookie.value === "" && cookie.maxAge === 0));
});

test("Supabase cookie adapter preserves required private no-store headers", () => {
  const written = new Map<string, string>();

  applySupabaseResponseHeaders(
    {
      set(name, value) {
        written.set(name, value);
      },
    },
    {
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache",
    },
  );

  assert.equal(
    written.get("Cache-Control"),
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  assert.equal(written.get("Expires"), "0");
  assert.equal(written.get("Pragma"), "no-cache");
});

test("secure browser sign-out clears caches and redirects home after global sign-out", async () => {
  const events: string[] = [];

  const result = await performSecureSignOut({
    signOut: async (scope) => {
      events.push(`sign-out:${scope}`);
      return { error: null };
    },
    purgeCaches: async () => {
      events.push("purge-caches");
    },
    replaceLocation: (path) => {
      events.push(`replace:${path}`);
    },
  });

  assert.deepEqual(events, ["sign-out:global", "purge-caches", "replace:/"]);
  assert.deepEqual(result, { ok: true });
});

test("secure browser sign-out falls back locally without exposing provider errors", async () => {
  const events: string[] = [];

  const result = await performSecureSignOut({
    signOut: async (scope) => {
      events.push(`sign-out:${scope}`);
      return scope === "global"
        ? { error: new Error("private Supabase token and internal endpoint") }
        : { error: null };
    },
    purgeCaches: async () => {
      events.push("purge-caches");
    },
    replaceLocation: (path) => {
      events.push(`replace:${path}`);
      assert.doesNotMatch(path, /Supabase|token|endpoint/i);
    },
  });

  assert.deepEqual(events, [
    "sign-out:global",
    "sign-out:local",
    "purge-caches",
    "replace:/login?message=%E7%99%BB%E5%87%BA%E5%A4%B1%E6%95%97%EF%BC%8C%E8%AB%8B%E9%87%8D%E6%96%B0%E7%99%BB%E5%85%A5%E3%80%82",
  ]);
  assert.deepEqual(result, { ok: false });
});
