import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { mapInBodyRecordRow } from "@/lib/inbody";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { inbodyRecordInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

const inbodyRecordSelect =
  "id,user_id,measured_at,weight_kg,skeletal_muscle_kg,body_fat_mass_kg,body_fat_percentage,bmi,waist_hip_ratio,visceral_fat_area_cm2,basal_metabolic_rate_kcal,inbody_score,note,ai_summary,source,created_at";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = inbodyRecordInputSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid InBody record payload.",
      422,
      parsed.error.flatten(),
    );
  }

  if (!hasSupabaseConfig()) {
    return ok(
      {
        persisted: false,
        inbodyRecord: {
          id: "demo-inbody-record",
          userId: "demo-user",
          ...parsed.data,
          note: parsed.data.note || null,
          aiSummary: parsed.data.aiSummary || null,
          createdAt: new Date().toISOString(),
        },
        safetyNotice:
          "Demo mode: Supabase is not configured. The InBody record was validated but not saved.",
      },
      { status: 202 },
    );
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const { data: record, error: insertError } = await supabase
    .from("inbody_records")
    .insert({
      user_id: user.id,
      measured_at: parsed.data.measuredAt,
      weight_kg: parsed.data.weightKg,
      skeletal_muscle_kg: parsed.data.skeletalMuscleKg,
      body_fat_mass_kg: parsed.data.bodyFatMassKg,
      body_fat_percentage: parsed.data.bodyFatPercentage,
      bmi: parsed.data.bmi,
      waist_hip_ratio: parsed.data.waistHipRatio,
      visceral_fat_area_cm2: parsed.data.visceralFatAreaCm2,
      basal_metabolic_rate_kcal: parsed.data.basalMetabolicRateKcal,
      inbody_score: parsed.data.inbodyScore,
      note: parsed.data.note || null,
      ai_summary: parsed.data.aiSummary || null,
      source: parsed.data.source,
    })
    .select(inbodyRecordSelect)
    .single();

  if (insertError || !record) {
    return apiError(
      "SERVER_ERROR",
      "Unable to save InBody record.",
      500,
      insertError?.message,
    );
  }

  if (parsed.data.analysisId) {
    const { error: updateError } = await supabase
      .from("inbody_scan_analyses")
      .update({ inbody_record_id: record.id })
      .eq("id", parsed.data.analysisId)
      .eq("user_id", user.id);

    if (updateError) {
      return apiError(
        "SERVER_ERROR",
        "InBody record saved, but the photo analysis could not be linked.",
        500,
        updateError.message,
      );
    }
  }

  return ok(
    { persisted: true, inbodyRecord: mapInBodyRecordRow(record) },
    { status: 201 },
  );
}
