import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { emptyGlp1LatestSummary } from "@/lib/glp1";
import { getLatestGlp1SummaryForCurrentUser } from "@/lib/glp1-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      summary: emptyGlp1LatestSummary(),
    });
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  return ok({
    persisted: true,
    summary: await getLatestGlp1SummaryForCurrentUser(),
  });
}
