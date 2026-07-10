import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { isHighSideEffectAlert } from "@/lib/glp1";
import { getLatestGlp1SideEffectForCurrentUser } from "@/lib/glp1-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      sideEffectLog: null,
      highSideEffectAlert: false,
    });
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const sideEffectLog = await getLatestGlp1SideEffectForCurrentUser();

  return ok({
    persisted: true,
    sideEffectLog,
    highSideEffectAlert: isHighSideEffectAlert(sideEffectLog),
  });
}
