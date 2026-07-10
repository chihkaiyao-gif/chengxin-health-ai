import { personaLabels } from "@/lib/assessment";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type { AssessmentPersona, AssessmentResult } from "@/lib/types";

type LatestAssessmentRow = {
  persona: AssessmentPersona;
  recommended_path: string;
  risk_flags: string[] | null;
  needs_medical_review: boolean;
  safety_message: string;
  today_recommendations: AssessmentResult["todayRecommendations"];
  completed_at: string;
};

export async function getLatestAssessmentResultForCurrentUser(): Promise<AssessmentResult | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("assessment_results")
    .select(
      "persona,recommended_path,risk_flags,needs_medical_review,safety_message,today_recommendations,completed_at",
    )
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle<LatestAssessmentRow>();

  if (error || !data) {
    return null;
  }

  return {
    persona: data.persona,
    personaLabel: personaLabels[data.persona],
    recommendedPath: data.recommended_path,
    riskFlags: (data.risk_flags || []) as AssessmentResult["riskFlags"],
    needsMedicalReview: data.needs_medical_review,
    safetyMessage: data.safety_message,
    todayRecommendations: data.today_recommendations,
    completedAt: data.completed_at,
  };
}
