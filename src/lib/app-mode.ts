export type AppMode = "demo" | "development" | "staging" | "production";

type EnvLike = Record<string, string | undefined>;

const explicitModes = new Set<AppMode>([
  "demo",
  "development",
  "staging",
  "production",
]);

function normalized(value: string | undefined) {
  return value?.trim().toLowerCase() || "";
}

export function getAppMode(env: EnvLike = process.env): AppMode {
  const explicitMode = normalized(env.APP_MODE);

  if (explicitMode) {
    if (!explicitModes.has(explicitMode as AppMode)) {
      throw new Error("APP_MODE must be demo, development, staging, or production.");
    }
    return explicitMode as AppMode;
  }

  const publicEnvironment = normalized(env.NEXT_PUBLIC_APP_ENV);
  if (publicEnvironment === "staging" || publicEnvironment === "production") {
    return publicEnvironment;
  }

  if (normalized(env.NODE_ENV) === "production") {
    return "production";
  }

  // Backward-compatible local development fallback only. A production
  // runtime must opt into demo explicitly with APP_MODE=demo.
  if (normalized(env.NEXT_PUBLIC_DEMO_MODE) === "true") {
    return "demo";
  }

  return "development";
}

export function isDemoModeEnv(env: EnvLike = process.env) {
  return getAppMode(env) === "demo";
}
