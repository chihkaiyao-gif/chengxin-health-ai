import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { getClinicPatientDetail } from "@/lib/clinic-patient";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, props: { params: Promise<{ patientId: string }> }) {
  const params = await props.params;
  if (!hasSupabaseConfig()) {
    const detail = await getClinicPatientDetail(params.patientId);

    return ok({
      persisted: false,
      detail,
    });
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const detail = await getClinicPatientDetail(params.patientId);

  if (!detail) {
    return apiError("FORBIDDEN", "Patient is not available for this user.", 403);
  }

  await logAuditEvent(
    {
      targetUserId: detail.patient.id,
      action: "patient.view",
      resourceType: "patient",
      resourceId: detail.patient.id,
      metadata: { source: "clinic_patient_detail_api" },
    },
    request,
  );

  return ok({
    persisted: true,
    detail,
  });
}
