import { apiError, ok } from "@/lib/api-response";
import {
  generateVisitReport,
  type AiProviderName,
} from "@/lib/ai/provider";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import {
  buildVisitReportPlainText,
  buildVisitReportSource,
  createFallbackVisitReport,
  getClinicPatientDetail,
  getReportPeriod,
} from "@/lib/clinic-patient";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/server";
import { assertClinicUsageLimit, incrementUsageCounter } from "@/lib/usage";
import { visitReportRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

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

  let aiProvider: AiProviderName | "fallback" = "fallback";
  let summary = createFallbackVisitReport(detail);

  try {
    const aiResult = await generateVisitReport({
      source: buildVisitReportSource(detail),
    });

    if (aiResult) {
      summary = aiResult.data;
      aiProvider = aiResult.provider;
    }
  } catch {
    if (!isDemoMode()) {
      return apiError(
        "AI_UNAVAILABLE",
        "AI 服務暫時無法使用，請稍後再試。",
        503,
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
      { status: aiProvider !== "fallback" ? 201 : 202 },
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
