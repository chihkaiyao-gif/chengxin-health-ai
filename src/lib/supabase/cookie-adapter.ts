import type { CookieOptions } from "@supabase/ssr";

export type SupabaseCookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

type CookieWriter = {
  set(cookie: SupabaseCookieToSet["options"] & { name: string; value: string }): unknown;
};

type HeaderWriter = {
  set(name: string, value: string): unknown;
};

export function applySupabaseCookies(
  writer: CookieWriter,
  cookiesToSet: SupabaseCookieToSet[],
) {
  for (const { name, value, options } of cookiesToSet) {
    writer.set({ name, value, ...options });
  }
}

export function applySupabaseResponseHeaders(
  writer: HeaderWriter,
  headers: Record<string, string>,
) {
  for (const [name, value] of Object.entries(headers)) {
    writer.set(name, value);
  }
}
