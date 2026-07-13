import { apiError, ok } from "@/lib/api-response";
import { hasAiProviderConfig } from "@/lib/ai/provider";
import { getCurrentUser } from "@/lib/auth";
import { getTodayCoachInsightForCurrentUser } from "@/lib/ai-coach";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok(await getTodayCoachInsightForCurrentUser());
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "請先登入。", 401);
  }

  const result = await getTodayCoachInsightForCurrentUser();

  if (!isDemoMode() && !hasAiProviderConfig() && !result.persisted) {
    return apiError(
      "AI_UNAVAILABLE",
      "AI 服務暫時無法使用，請稍後再試。",
      503,
    );
  }

  return ok(result);
}
