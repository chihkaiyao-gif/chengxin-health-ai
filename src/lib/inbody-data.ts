import { getCurrentUser } from "@/lib/auth";
import {
  buildInBodyLatestSummary,
  emptyInBodyLatestSummary,
  mapInBodyRecordRow,
} from "@/lib/inbody";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type { InBodyLatestSummary, InBodyRecord } from "@/lib/types";

const inbodyRecordSelect =
  "id,user_id,measured_at,weight_kg,skeletal_muscle_kg,body_fat_mass_kg,body_fat_percentage,bmi,waist_hip_ratio,visceral_fat_area_cm2,basal_metabolic_rate_kcal,inbody_score,note,ai_summary,source,created_at";

export async function getInBodyHistoryForCurrentUser(
  limit = 12,
): Promise<InBodyRecord[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("inbody_records")
    .select(inbodyRecordSelect)
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(mapInBodyRecordRow);
}

export async function getLatestInBodySummaryForCurrentUser(): Promise<InBodyLatestSummary> {
  if (!hasSupabaseConfig()) {
    return emptyInBodyLatestSummary();
  }

  const records = await getInBodyHistoryForCurrentUser(2);
  return buildInBodyLatestSummary(records);
}

export { inbodyRecordSelect };
