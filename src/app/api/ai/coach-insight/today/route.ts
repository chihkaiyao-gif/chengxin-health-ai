import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { getTodayCoachInsightForCurrentUser } from "@/lib/ai-coach";
import { hasOpenAIClient, missingOpenAiConfigMessage } from "@/lib/openai";
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

  if (!isDemoMode() && !hasOpenAIClient() && !result.persisted) {
    return apiError("SERVER_ERROR", missingOpenAiConfigMessage, 500);
  }

  return ok(result);
}
