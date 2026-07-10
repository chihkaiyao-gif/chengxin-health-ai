import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import {
  buildGlp1MedicationLog,
  glp1SafetyNotice,
  mapGlp1MedicationLogRow,
} from "@/lib/glp1";
import {
  getGlp1HistoryForCurrentUser,
  glp1MedicationLogSelect,
} from "@/lib/glp1-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { glp1MedicationLogInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

async function parsePayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => null);
  }

  const formData = await request.formData();
  return Object.fromEntries(formData);
}

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const items = await getGlp1HistoryForCurrentUser();

  return ok({
    persisted: true,
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    },
  });
}

export async function POST(request: Request) {
  const body = await parsePayload(request);
  const parsed = glp1MedicationLogInputSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid GLP-1 medication log payload.",
      422,
      parsed.error.flatten(),
    );
  }

  if (!hasSupabaseConfig()) {
    const medicationLog = buildGlp1MedicationLog(parsed.data, "demo-user");

    return ok(
      {
        accepted: true,
        persisted: false,
        medicationLog,
        safetyNotice: `${glp1SafetyNotice} Demo mode: Supabase is not configured, so the record was validated but not saved.`,
      },
      { status: 202 },
    );
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const nextInjectionDate =
    parsed.data.nextInjectionDate ||
    buildGlp1MedicationLog(parsed.data, user.id).nextInjectionDate;

  const { data: medicationLog, error } = await supabase
    .from("glp1_medication_logs")
    .insert({
      patient_id: user.id,
      user_id: user.id,
      medication_name: parsed.data.medicationName,
      dose_label: `${parsed.data.doseMg} mg`,
      dose_mg: parsed.data.doseMg,
      injection_date: parsed.data.injectionDate,
      next_injection_date: nextInjectionDate,
      injection_method: parsed.data.injectionMethod,
      injection_site: parsed.data.injectionSite,
      lot_number: parsed.data.lotNumber || null,
      note: parsed.data.note || null,
      notes: parsed.data.note || null,
      physician_supervised: true,
      safety_notice: glp1SafetyNotice,
    })
    .select(glp1MedicationLogSelect)
    .single();

  if (error || !medicationLog) {
    return apiError(
      "SERVER_ERROR",
      "Unable to save GLP-1 medication log.",
      500,
      error?.message,
    );
  }

  const mappedLog = mapGlp1MedicationLogRow(medicationLog);
  await logAuditEvent(
    {
      targetUserId: user.id,
      action: "glp1_log.create",
      resourceType: "glp1_medication_log",
      resourceId: mappedLog.id,
      metadata: {
        medicationName: mappedLog.medicationName,
        doseMg: mappedLog.doseMg,
        injectionDate: mappedLog.injectionDate,
        nextInjectionDate: mappedLog.nextInjectionDate,
      },
    },
    request,
  );

  return ok(
    {
      accepted: true,
      persisted: true,
      medicationLog: mappedLog,
      safetyNotice: glp1SafetyNotice,
    },
    { status: 201 },
  );
}
