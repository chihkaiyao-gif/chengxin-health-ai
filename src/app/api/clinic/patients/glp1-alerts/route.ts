import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { getClinicGlp1Alerts } from "@/lib/glp1-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      items: await getClinicGlp1Alerts(),
      next: "Connect Supabase clinic links to show live patients.",
    });
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  return ok({
    persisted: true,
    items: await getClinicGlp1Alerts(),
  });
}
