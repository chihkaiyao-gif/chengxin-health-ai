import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import {
  calculateNutritionSummary,
  emptyNutritionSummary,
  mapFoodLogRow,
} from "@/lib/nutrition";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      summary: emptyNutritionSummary(),
      items: [],
    });
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const { startIso, endIso } = getTodayRange();
  const { data, error } = await supabase
    .from("food_logs")
    .select(
      "id,user_id,meal_type,meal_name,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,source,note,eaten_at,created_at",
    )
    .eq("user_id", user.id)
    .gte("eaten_at", startIso)
    .lt("eaten_at", endIso)
    .order("eaten_at", { ascending: false });

  if (error) {
    return apiError(
      "SERVER_ERROR",
      "Unable to load today's food logs.",
      500,
      error.message,
    );
  }

  const items = (data || []).map(mapFoodLogRow);

  return ok({
    persisted: true,
    summary: calculateNutritionSummary(items),
    items,
  });
}
