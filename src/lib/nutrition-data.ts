import { getCurrentUser } from "@/lib/auth";
import {
  calculateNutritionSummary,
  emptyNutritionSummary,
  mapFoodLogRow,
} from "@/lib/nutrition";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type { FoodLog, TodayNutritionSummary } from "@/lib/types";

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

export async function getTodayFoodLogsForCurrentUser(): Promise<FoodLog[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
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

  if (error || !data) {
    return [];
  }

  return data.map(mapFoodLogRow);
}

export async function getTodayNutritionSummaryForCurrentUser(): Promise<TodayNutritionSummary> {
  if (!hasSupabaseConfig()) {
    return emptyNutritionSummary();
  }

  const logs = await getTodayFoodLogsForCurrentUser();
  return calculateNutritionSummary(logs);
}
