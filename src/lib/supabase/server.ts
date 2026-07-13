import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { getOpenAiEnvStatus } from "@/lib/ai/openai-model-config";
import { getAppMode, isDemoModeEnv } from "@/lib/app-mode";

const missingSupabaseConfigMessage =
  "Supabase server configuration is unavailable.";

const defaultStorageBuckets = {
  mealPhotos: "meal-photos",
  inbodyScans: "inbody-scans",
} as const;

function configuredAiProvider() {
  return process.env.AI_PROVIDER?.trim().toLowerCase() || "openai";
}

export function isDemoMode() {
  return isDemoModeEnv();
}

export function hasActualSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function hasSupabaseConfig() {
  if (isDemoMode()) {
    return false;
  }

  const configured = hasActualSupabaseConfig();

  if (!configured && !isDemoMode()) {
    throw new Error(missingSupabaseConfigMessage);
  }

  return configured;
}

export function shouldUseDemoFallback() {
  return isDemoMode();
}

export function hasOpenAiConfig() {
  return getOpenAiEnvStatus().openaiProviderConfigured;
}

export function hasAiProviderConfig() {
  const provider = configuredAiProvider();
  if (isDemoMode() && provider === "demo") return true;
  return provider === "openai" && Boolean(process.env.OPENAI_API_KEY);
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
  const appMode = getAppMode();
  const demoMode = isDemoMode();
  const supabaseConfigured = hasActualSupabaseConfig();
  const aiProvider = configuredAiProvider();
  const aiProviderConfigured = hasAiProviderConfig();
  const openAiStatus = getOpenAiEnvStatus();
  const storageConfigured = hasStorageConfig();
  const storageBucketsConfigured = demoMode
    ? storageConfigured
    : hasExplicitStorageBucketConfig();
  const appVersion = getAppVersion();
  const requiredConfigurationMissing = !demoMode && [
    !process.env.NEXT_PUBLIC_APP_URL ? "NEXT_PUBLIC_APP_URL" : null,
    !process.env.NEXT_PUBLIC_SUPABASE_URL
      ? "NEXT_PUBLIC_SUPABASE_URL"
      : null,
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : null,
    !process.env.SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET
      ? "SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET"
      : null,
    !process.env.SUPABASE_STORAGE_INBODY_SCANS_BUCKET
      ? "SUPABASE_STORAGE_INBODY_SCANS_BUCKET"
      : null,
    !aiProviderConfigured ? "AI_PROVIDER_CONFIGURATION" : null,
    aiProvider === "openai" && !openAiStatus.openaiModelConfigured
      ? "OPENAI_MODEL"
      : null,
  ].some(Boolean);

  return {
    status: requiredConfigurationMissing ? "misconfigured" : "ok",
    environment: appMode,
    demoMode,
    supabaseConfigured,
    supabasePublishableKeyConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    supabaseAdminConfigured: hasSupabaseAdminCapability(),
    aiProviderConfigured,
    openaiModelConfigured: openAiStatus.openaiModelConfigured,
    openaiFallbackConfigured: openAiStatus.openaiFallbackConfigured,
    storageConfigured,
    storageBucketsConfigured,
    version: appVersion,
    appVersion,
    requiredConfigurationMissing,
  };
}

export async function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(missingSupabaseConfigMessage);
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

export function createSecretKeyClient() {
  if (!hasSupabaseAdminCapability()) {
    return null;
  }

  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function hasSupabaseAdminCapability() {
  return Boolean(
    !isDemoMode() &&
      hasActualSupabaseConfig() &&
      process.env.SUPABASE_SECRET_KEY,
  );
}
