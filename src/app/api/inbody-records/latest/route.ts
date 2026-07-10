import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import {
  buildInBodyLatestSummary,
  emptyInBodyLatestSummary,
  mapInBodyRecordRow,
} from "@/lib/inbody";
import { inbodyRecordSelect } from "@/lib/inbody-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      summary: emptyInBodyLatestSummary(),
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
    .limit(2);

  if (error) {
    return apiError(
      "SERVER_ERROR",
      "Unable to load latest InBody records.",
      500,
      error.message,
    );
  }

  const records = (data || []).map(mapInBodyRecordRow);

  return ok({
    persisted: true,
    summary: buildInBodyLatestSummary(records),
  });
}
