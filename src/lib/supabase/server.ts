import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { getOpenAiEnvStatus } from "@/lib/ai/openai-model-config";

const missingSupabaseConfigMessage =
  "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or set NEXT_PUBLIC_DEMO_MODE=true for local demo fallback.";

const defaultStorageBuckets = {
  mealPhotos: "meal-photos",
  inbodyScans: "inbody-scans",
} as const;

type AiProviderName = "openai" | "anthropic" | "gemini" | "deepseek";

const aiProviderKeyEnvByName: Record<AiProviderName, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
};

function getAiProviderNameForEnv(): AiProviderName {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  if (
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "gemini" ||
    provider === "deepseek"
  ) {
    return provider;
  }

  return "openai";
}

function getAiProviderKeyEnvForEnv(provider = getAiProviderNameForEnv()) {
  return aiProviderKeyEnvByName[provider];
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export function hasActualSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
  return getOpenAiEnvStatus().openaiProviderConfigured;
}

export function hasAiProviderConfig() {
  return Boolean(process.env[getAiProviderKeyEnvForEnv()]);
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
  const aiProvider = getAiProviderNameForEnv();
  const aiProviderKeyEnv = getAiProviderKeyEnvForEnv(aiProvider);
  const aiConfigured = hasAiProviderConfig();
  const openAiStatus = getOpenAiEnvStatus();
  const openaiConfigured = openAiStatus.openaiProviderConfigured;
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
    !demoMode && !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
      : null,
    !demoMode && !process.env.SUPABASE_SECRET_KEY
      ? "SUPABASE_SECRET_KEY"
      : null,
    !demoMode && !process.env.SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET
      ? "SUPABASE_STORAGE_MEAL_PHOTOS_BUCKET"
      : null,
    !demoMode && !process.env.SUPABASE_STORAGE_INBODY_SCANS_BUCKET
      ? "SUPABASE_STORAGE_INBODY_SCANS_BUCKET"
      : null,
    !demoMode && !aiConfigured ? aiProviderKeyEnv : null,
    !demoMode && aiProvider === "openai" && !openAiStatus.openaiModelConfigured
      ? "OPENAI_MODEL"
      : null,
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
    supabasePublishableKeyConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    supabaseSecretKeyConfigured: Boolean(process.env.SUPABASE_SECRET_KEY),
    aiProvider,
    aiProviderKeyEnv,
    aiConfigured,
    openaiConfigured,
    openaiProvider: openAiStatus.openaiProvider,
    openaiProviderConfigured: openAiStatus.openaiProviderConfigured,
    openaiModelConfigured: openAiStatus.openaiModelConfigured,
    openaiFallbackConfigured: openAiStatus.openaiFallbackConfigured,
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    googleConfigured: Boolean(process.env.GOOGLE_API_KEY),
    deepseekConfigured: Boolean(process.env.DEEPSEEK_API_KEY),
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
  if (!hasActualSupabaseConfig() || !process.env.SUPABASE_SECRET_KEY) {
    return null;
  }

  return createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
