import { ok } from "@/lib/api-response";
import { getEnvironmentStatus } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const status = getEnvironmentStatus();

  return ok({
    app: "Chengxin Health AI",
    status: status.status,
    environment: status.environment,
    demoMode: status.demoMode,
    supabaseConfigured: status.supabaseConfigured,
    openaiConfigured: status.openaiConfigured,
    storageConfigured: status.storageConfigured,
    storageBucketsConfigured: status.storageBucketsConfigured,
    storageBuckets: status.storageBuckets,
    appVersion: status.appVersion,
    commitSha: status.commitSha,
    version: status.version,
    missingRequiredEnv: status.missingRequiredEnv,
    requiredEnvMissing: status.requiredEnvMissing,
  });
}
