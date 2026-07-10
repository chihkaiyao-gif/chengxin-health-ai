import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { mapInBodyRecordRow } from "@/lib/inbody";
import { inbodyRecordSelect } from "@/lib/inbody-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") || 12);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 50)
    : 12;

  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      items: [],
      pagination: { limit, hasMore: false },
    });
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const { data, error } = await supabase
    .from("inbody_records")
    .select(inbodyRecordSelect)
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .limit(limit + 1);

  if (error) {
    return apiError(
      "SERVER_ERROR",
      "Unable to load InBody history.",
      500,
      error.message,
    );
  }

  const rows = data || [];

  return ok({
    persisted: true,
    items: rows.slice(0, limit).map(mapInBodyRecordRow),
    pagination: { limit, hasMore: rows.length > limit },
  });
}
