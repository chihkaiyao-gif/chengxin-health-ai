import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";

const missingSupabaseConfigMessage =
  "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or set NEXT_PUBLIC_DEMO_MODE=true for local demo fallback.";

const defaultStorageBuckets = {
  mealPhotos: "meal-photos",
  inbodyScans: "inbody-scans",
} as const;

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function hasActualSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function hasSupabaseConfig() {
  const configured = hasActualSupabaseConfig();

  if (!configured && !isDemoMode()) {
    throw new Error(missingSupabaseConfigMessage);
  }

  return configured;
}

export function shouldUseDemoFallback() {
  return isDemoMode() && !hasActualSupabaseConfig();
}

export function hasOpenAiConfig() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getStorageBucketSettings() {
  return {
    mealPhotos:
      process.env.SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET ||
      defaultStorageBuckets.mealPhotos,
    inbodyScans:
      process.env.SUPABASE_STORAGE_INBODY_SCANS_BUCKET ||
      defaultStorageBuckets.inbodyScans,
  };
}

export function hasStorageConfig() {
  const buckets = getStorageBucketSettings();

  return Boolean(buckets.mealPhotos && buckets.inbodyScans);
}

export function hasExplicitStorageBucketConfig() {
  return Boolean(
    process.env.SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET &&
      process.env.SUPABASE_STORAGE_INBODY_SCANS_BUCKET,
  );
}

export function getAppVersion() {
  return (
    process.env.NEXT_PUBLIC_APP_VERSION ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
    "0.1.0"
  );
}

export function getCommitSha() {
  return process.env.VERCEL_GIT_COMMIT_SHA || null;
}

export function getEnvironmentStatus() {
  const demoMode = isDemoMode();
  const supabaseConfigured = hasActualSupabaseConfig();
  const openaiConfigured = hasOpenAiConfig();
  const storageConfigured = hasStorageConfig();
  const storageBucketsConfigured = demoMode
    ? storageConfigured
    : hasExplicitStorageBucketConfig();
  const appVersion = getAppVersion();
  const commitSha = getCommitSha();
  const missingRequiredEnv = [
    !process.env.NEXT_PUBLIC_APP_URL ? "NEXT_PUBLIC_APP_URL" : null,
    !demoMode && !process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "NEXT_PUBLIC_SUPABASE_URL"
      : null,
    !demoMode && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY"
      : null,
    !demoMode && !process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "SUPABASE_SERVICE_ROLE_KEY"
      : null,
    !demoMode && !process.env.SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET
      ? "SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET"
      : null,
    !demoMode && !process.env.SUPABASE_STORAGE_INBODY_SCANS_BUCKET
      ? "SUPABASE_STORAGE_INBODY_SCANS_BUCKET"
      : null,
    !demoMode && !process.env.OPENAI_API_KEY ? "OPENAI_API_KEY" : null,
  ].filter(Boolean) as string[];

  return {
    status: missingRequiredEnv.length > 0 ? "misconfigured" : "ok",
    environment:
      process.env.VERCEL_ENV ||
      process.env.NEXT_PUBLIC_APP_ENV ||
      process.env.NODE_ENV ||
      "development",
    demoMode,
    supabaseConfigured,
    openaiConfigured,
    storageConfigured,
    storageBucketsConfigured,
    storageBuckets: getStorageBucketSettings(),
    version: appVersion,
    appVersion,
    commitSha,
    missingRequiredEnv,
    requiredEnvMissing: missingRequiredEnv,
  };
}

export function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(missingSupabaseConfigMessage);
  }

  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
}

export function createServiceRoleClient() {
  if (!hasActualSupabaseConfig() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
