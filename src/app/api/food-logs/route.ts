import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { mapFoodLogRow } from "@/lib/nutrition";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { foodLogInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = foodLogInputSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid food log payload.",
      422,
      parsed.error.flatten(),
    );
  }

  if (!hasSupabaseConfig()) {
    return ok(
      {
        persisted: false,
        foodLog: {
          id: "demo-food-log",
          ...parsed.data,
          userId: "demo-user",
          note: parsed.data.note || null,
          createdAt: new Date().toISOString(),
        },
        safetyNotice:
          "Demo mode: Supabase is not configured. The food log was validated but not saved.",
      },
      { status: 202 },
    );
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const { data: foodLog, error: insertError } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      meal_type: parsed.data.mealType,
      meal_name: parsed.data.mealName,
      calories_kcal: parsed.data.caloriesKcal,
      protein_g: parsed.data.proteinG,
      carbs_g: parsed.data.carbsG,
      fat_g: parsed.data.fatG,
      fiber_g: parsed.data.fiberG,
      sodium_mg: parsed.data.sodiumMg,
      source: parsed.data.source,
      note: parsed.data.note || null,
      eaten_at: parsed.data.eatenAt,
    })
    .select(
      "id,user_id,meal_type,meal_name,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,source,note,eaten_at,created_at",
    )
    .single();

  if (insertError || !foodLog) {
    return apiError(
      "SERVER_ERROR",
      "Unable to save food log.",
      500,
      insertError?.message,
    );
  }

  if (parsed.data.analysisId) {
    const { error: updateError } = await supabase
      .from("food_photo_analyses")
      .update({ food_log_id: foodLog.id })
      .eq("id", parsed.data.analysisId)
      .eq("user_id", user.id);

    if (updateError) {
      return apiError(
        "SERVER_ERROR",
        "Food log saved, but the photo analysis could not be linked.",
        500,
        updateError.message,
      );
    }
  }

  return ok({ persisted: true, foodLog: mapFoodLogRow(foodLog) }, { status: 201 });
}
