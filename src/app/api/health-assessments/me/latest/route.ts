import { apiError, ok } from "@/lib/api-response";
import { personaLabels } from "@/lib/assessment";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type { AssessmentPersona, AssessmentResult } from "@/lib/types";

export const dynamic = "force-dynamic";

type AssessmentResultRow = {
  persona: AssessmentPersona;
  recommended_path: string;
  risk_flags: string[];
  needs_medical_review: boolean;
  safety_message: string;
  today_recommendations: AssessmentResult["todayRecommendations"];
  completed_at: string;
};

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      result: null,
      needsAssessment: true,
      safetyNotice:
        "Demo mode: Supabase is not configured, so latest assessment cannot be loaded.",
    });
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const { data, error } = await supabase
    .from("assessment_results")
    .select(
      "persona,recommended_path,risk_flags,needs_medical_review,safety_message,today_recommendations,completed_at",
    )
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle<AssessmentResultRow>();

  if (error) {
    return apiError(
      "SERVER_ERROR",
      "Unable to load latest assessment result.",
      500,
      error.message,
    );
  }

  if (!data) {
    return ok({ result: null, needsAssessment: true });
  }

  return ok({
    result: {
      persona: data.persona,
      personaLabel: personaLabels[data.persona],
      recommendedPath: data.recommended_path,
      riskFlags: data.risk_flags,
      needsMedicalReview: data.needs_medical_review,
      safetyMessage: data.safety_message,
      todayRecommendations: data.today_recommendations,
      completedAt: data.completed_at,
    },
    needsAssessment: false,
  });
}
