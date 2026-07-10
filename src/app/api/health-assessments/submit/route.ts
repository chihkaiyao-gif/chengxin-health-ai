import { apiError, ok } from "@/lib/api-response";
import { computeAssessmentResult } from "@/lib/assessment";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { assessmentWizardSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = assessmentWizardSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid assessment answers.",
      422,
      parsed.error.flatten(),
    );
  }

  if (!parsed.data.privacyConsent || !parsed.data.dataUseConsent) {
    return apiError(
      "VALIDATION_ERROR",
      "Privacy and data-use consent are required before assessment submission.",
      422,
    );
  }

  const result = computeAssessmentResult(parsed.data);

  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      result,
      safetyNotice:
        "Demo mode: Supabase is not configured. The result was calculated but not saved.",
    });
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const exerciseLevel =
    parsed.data.exerciseExperience === "athlete" ||
    parsed.data.exerciseExperience === "regular_weight_training"
      ? "HIGH"
      : parsed.data.exerciseExperience === "none"
        ? "LOW"
        : "MEDIUM";

  const assessmentInsert = {
    patient_id: user.id,
    user_id: user.id,
    goal: parsed.data.goals.join(","),
    height_cm: parsed.data.heightCm,
    weight_kg: parsed.data.weightKg,
    exercise_level: exerciseLevel,
    chronic_conditions: parsed.data.medicalHistory.join(","),
    medications: parsed.data.medications.join(","),
    answers: parsed.data,
    raw_answers: parsed.data,
    risk_flags: result.riskFlags,
    persona: result.persona,
    recommended_path: result.recommendedPath,
    ai_safety_notice: result.safetyMessage,
    completed_at: result.completedAt,
  };

  const { data: assessment, error: assessmentError } = await supabase
    .from("health_assessments")
    .insert(assessmentInsert)
    .select("id")
    .single();

  if (assessmentError || !assessment) {
    return apiError(
      "SERVER_ERROR",
      "Unable to save health assessment.",
      500,
      assessmentError?.message,
    );
  }

  const { error: answersError } = await supabase
    .from("assessment_answers")
    .insert({
      assessment_id: assessment.id,
      user_id: user.id,
      raw_answers: parsed.data,
      completed_at: result.completedAt,
    });

  if (answersError) {
    return apiError(
      "SERVER_ERROR",
      "Unable to save assessment answers.",
      500,
      answersError.message,
    );
  }

  const { error: resultError } = await supabase
    .from("assessment_results")
    .insert({
      assessment_id: assessment.id,
      user_id: user.id,
      raw_answers: parsed.data,
      risk_flags: result.riskFlags,
      persona: result.persona,
      recommended_path: result.recommendedPath,
      needs_medical_review: result.needsMedicalReview,
      safety_message: result.safetyMessage,
      today_recommendations: result.todayRecommendations,
      completed_at: result.completedAt,
    });

  if (resultError) {
    return apiError(
      "SERVER_ERROR",
      "Unable to save assessment result.",
      500,
      resultError.message,
    );
  }

  return ok({ persisted: true, assessmentId: assessment.id, result });
}
