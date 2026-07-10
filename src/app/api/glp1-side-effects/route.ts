import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import {
  buildGlp1SideEffectLog,
  glp1SafetyNotice,
  glp1SevereSymptomNotice,
  isHighSideEffectAlert,
  mapGlp1SideEffectLogRow,
} from "@/lib/glp1";
import { glp1SideEffectLogSelect } from "@/lib/glp1-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { glp1SideEffectInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function parsePayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }

  const formData = await request.formData();
  return Object.fromEntries(formData);
}

export async function POST(request: Request) {
  const body = await parsePayload(request);
  const parsed = glp1SideEffectInputSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid GLP-1 side effect payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const highSideEffectAlert = isHighSideEffectAlert(parsed.data);

  if (!hasSupabaseConfig()) {
    return ok(
      {
        accepted: true,
        persisted: false,
        sideEffectLog: buildGlp1SideEffectLog(parsed.data, "demo-user"),
        highSideEffectAlert,
        safetyNotice: glp1SafetyNotice,
        severeSymptomNotice: glp1SevereSymptomNotice,
      },
      { status: 202 },
    );
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  if (parsed.data.medicationLogId) {
    const { data: medicationLog, error: medicationLogError } = await supabase
      .from("glp1_medication_logs")
      .select("id")
      .eq("id", parsed.data.medicationLogId)
      .or(`user_id.eq.${user.id},patient_id.eq.${user.id}`)
      .maybeSingle();

    if (medicationLogError || !medicationLog) {
      return apiError(
        "FORBIDDEN",
        "The selected medication log is not available for this user.",
        403,
        medicationLogError?.message,
      );
    }
  }

  const { data: sideEffectLog, error } = await supabase
    .from("glp1_side_effect_logs")
    .insert({
      user_id: user.id,
      medication_log_id: parsed.data.medicationLogId || null,
      nausea_score: parsed.data.nauseaScore,
      vomiting: parsed.data.vomiting,
      constipation_score: parsed.data.constipationScore,
      diarrhea_score: parsed.data.diarrheaScore,
      appetite_score: parsed.data.appetiteScore,
      dizziness: parsed.data.dizziness,
      hypoglycemia_feeling: parsed.data.hypoglycemiaFeeling,
      abdominal_pain_score: parsed.data.abdominalPainScore,
      dehydration_concern: parsed.data.dehydrationConcern,
      note: parsed.data.note || null,
    })
    .select(glp1SideEffectLogSelect)
    .single();

  if (error || !sideEffectLog) {
    return apiError(
      "SERVER_ERROR",
      "Unable to save GLP-1 side effect log.",
      500,
      error?.message,
    );
  }

  const mappedLog = mapGlp1SideEffectLogRow(sideEffectLog);
  await logAuditEvent(
    {
      targetUserId: user.id,
      action: "glp1_side_effect.create",
      resourceType: "glp1_side_effect_log",
      resourceId: mappedLog.id,
      metadata: {
        medicationLogId: mappedLog.medicationLogId,
        nauseaScore: mappedLog.nauseaScore,
        abdominalPainScore: mappedLog.abdominalPainScore,
        vomiting: mappedLog.vomiting,
        dehydrationConcern: mappedLog.dehydrationConcern,
        highSideEffectAlert,
      },
    },
    request,
  );

  return ok(
    {
      accepted: true,
      persisted: true,
      sideEffectLog: mappedLog,
      highSideEffectAlert,
      safetyNotice: glp1SafetyNotice,
      severeSymptomNotice: glp1SevereSymptomNotice,
    },
    { status: 201 },
  );
}
