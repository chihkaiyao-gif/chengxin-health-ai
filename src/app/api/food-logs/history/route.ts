import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { mapFoodLogRow } from "@/lib/nutrition";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") || 30);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 30;

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
    .from("food_logs")
    .select(
      "id,user_id,meal_type,meal_name,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,source,note,eaten_at,created_at",
    )
    .eq("user_id", user.id)
    .order("eaten_at", { ascending: false })
    .limit(limit + 1);

  if (error) {
    return apiError(
      "SERVER_ERROR",
      "Unable to load food log history.",
      500,
      error.message,
    );
  }

  const rows = data || [];
  const items = rows.slice(0, limit).map(mapFoodLogRow);

  return ok({
    persisted: true,
    items,
    pagination: { limit, hasMore: rows.length > limit },
  });
}
