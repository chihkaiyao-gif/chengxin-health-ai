import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import {
  buildVisitReportPlainText,
  buildVisitReportSource,
  createFallbackVisitReport,
  getClinicPatientDetail,
  getReportPeriod,
} from "@/lib/clinic-patient";
import {
  missingOpenAiConfigMessage,
  requireOpenAIClientForProduction,
} from "@/lib/openai";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/server";
import { assertClinicUsageLimit, incrementUsageCounter } from "@/lib/usage";
import type { VisitReportSummary } from "@/lib/types";
import {
  visitReportRequestSchema,
  visitReportSummarySchema,
} from "@/lib/validation";
import {
  buildVisitReportPromptInput,
  visitReportPrompt,
} from "@/prompts/visit-report";

export const runtime = "nodejs";

const visitReportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "weightChange30d",
    "skeletalMuscleChange",
    "bodyFatPercentageChange",
    "proteinTargetStatus",
    "exerciseExecutionRate",
    "glp1Adherence",
    "sideEffectSummary",
    "physicianAttentionItems",
    "visitCommunicationPoints",
    "safetyNotice",
  ],
  properties: {
    weightChange30d: { type: "string" },
    skeletalMuscleChange: { type: "string" },
    bodyFatPercentageChange: { type: "string" },
    proteinTargetStatus: { type: "string" },
    exerciseExecutionRate: { type: "string" },
    glp1Adherence: { type: "string" },
    sideEffectSummary: { type: "string" },
    physicianAttentionItems: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    visitCommunicationPoints: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    safetyNotice: { type: "string" },
  },
};

async function createAiVisitReport(
  source: unknown,
): Promise<{ summary: VisitReportSummary; provider: "openai" | "fallback" }> {
  const client = requireOpenAIClientForProduction();

  if (!client) {
    throw new Error(missingOpenAiConfigMessage);
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.5",
    instructions: [
      visitReportPrompt.systemPrompt,
      visitReportPrompt.developerPrompt,
    ].join("\n"),
    input: buildVisitReportPromptInput(source),
    text: {
      format: {
        type: "json_schema",
        name: "chengxin_clinic_visit_report",
        strict: true,
        schema: visitReportJsonSchema,
      },
    },
    store: false,
  });

  const parsedJson = JSON.parse(response.output_text);
  const parsed = visitReportSummarySchema.parse(parsedJson);

  return { summary: parsed, provider: "openai" };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = visitReportRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "回診報告請求格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const reportPeriod = getReportPeriod(parsed.data);
  const detail = await getClinicPatientDetail(parsed.data.patientId);

  if (!detail) {
    return apiError("FORBIDDEN", "你沒有權限查看這位病人資料。", 403);
  }

  const usageLimit = await assertClinicUsageLimit("aiVisitReportsMonthly");

  if (!usageLimit.allowed) {
    return apiError(
      "USAGE_LIMIT_EXCEEDED",
      "本月 AI 回診報告用量已達方案上限。",
      409,
      usageLimit.summary,
    );
  }

  let aiProvider: "openai" | "fallback" = "fallback";
  let summary = createFallbackVisitReport(detail);

  try {
    const aiResult = await createAiVisitReport(buildVisitReportSource(detail));
    summary = aiResult.summary;
    aiProvider = aiResult.provider;
  } catch (error) {
    if (!isDemoMode()) {
      return apiError(
        "SERVER_ERROR",
        error instanceof Error ? error.message : missingOpenAiConfigMessage,
        500,
      );
    }

    summary = createFallbackVisitReport(detail);
  }

  const plainTextSummary = buildVisitReportPlainText(summary);

  if (!hasSupabaseConfig()) {
    await logAuditEvent(
      {
        targetUserId: detail.patient.id,
        action: "visit_report.generate",
        resourceType: "clinic_visit_report",
        resourceId: "demo-clinic-visit-report",
        metadata: { aiProvider, persisted: false },
      },
      request,
    );

    return ok(
      {
        persisted: false,
        aiProvider,
        report: {
          id: "demo-clinic-visit-report",
          patientId: detail.patient.id,
          generatedBy: "demo-clinic-user",
          ...reportPeriod,
          aiSummary: summary,
          plainTextSummary,
          createdAt: new Date().toISOString(),
        },
        safetyNotice: summary.safetyNotice,
      },
      { status: aiProvider === "openai" ? 201 : 202 },
    );
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "請先登入。", 401);
  }

  const { data: report, error } = await supabase
    .from("clinic_visit_reports")
    .insert({
      patient_id: detail.patient.id,
      generated_by: user.id,
      report_period_start: reportPeriod.reportPeriodStart,
      report_period_end: reportPeriod.reportPeriodEnd,
      ai_summary: summary,
      plain_text_summary: plainTextSummary,
    })
    .select(
      "id,patient_id,generated_by,report_period_start,report_period_end,ai_summary,plain_text_summary,created_at",
    )
    .single();

  if (error || !report) {
    return apiError(
      "SERVER_ERROR",
      "無法儲存 AI 回診報告，請稍後再試。",
      500,
      error?.message,
    );
  }

  await incrementUsageCounter({
    targetUserId: detail.patient.id,
    counter: "aiVisitReports",
  });
  await logAuditEvent(
    {
      targetUserId: detail.patient.id,
      action: "visit_report.generate",
      resourceType: "clinic_visit_report",
      resourceId: report.id,
      metadata: {
        aiProvider,
        reportPeriodStart: reportPeriod.reportPeriodStart,
        reportPeriodEnd: reportPeriod.reportPeriodEnd,
      },
    },
    request,
  );

  return ok(
    {
      persisted: true,
      aiProvider,
      report: {
        id: report.id,
        patientId: report.patient_id,
        generatedBy: report.generated_by,
        reportPeriodStart: report.report_period_start,
        reportPeriodEnd: report.report_period_end,
        aiSummary: report.ai_summary,
        plainTextSummary: report.plain_text_summary,
        createdAt: report.created_at,
      },
      safetyNotice: summary.safetyNotice,
    },
    { status: 201 },
  );
}
