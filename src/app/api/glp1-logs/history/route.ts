import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { getGlp1HistoryForCurrentUser } from "@/lib/glp1-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const items = await getGlp1HistoryForCurrentUser();

  return ok({
    persisted: true,
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    },
  });
}
