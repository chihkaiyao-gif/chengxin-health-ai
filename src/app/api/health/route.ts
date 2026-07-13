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
    supabasePublishableKeyConfigured:
      status.supabasePublishableKeyConfigured,
    supabaseAdminConfigured: status.supabaseAdminConfigured,
    aiProviderConfigured: status.aiProviderConfigured,
    openaiModelConfigured: status.openaiModelConfigured,
    openaiFallbackConfigured: status.openaiFallbackConfigured,
    storageConfigured: status.storageConfigured,
    storageBucketsConfigured: status.storageBucketsConfigured,
    appVersion: status.appVersion,
    version: status.version,
    requiredConfigurationMissing: status.requiredConfigurationMissing,
  });
}
