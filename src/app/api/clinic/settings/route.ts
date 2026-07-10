import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getClinicSettings, updateClinicSettings } from "@/lib/clinic-saas";
import { clinicSettingsInputSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const context = await getClinicSettings();

  return ok({
    persisted: context.persisted,
    clinic: context.clinic,
    member: context.member,
    permissions: context.permissions,
  });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = clinicSettingsInputSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid clinic settings payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await updateClinicSettings(parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    if (result.error === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage clinic settings.", 403);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to update clinic settings.",
      500,
      result.details,
    );
  }

  await logAuditEvent(
    {
      clinicId: result.clinic.id,
      action: "clinic_settings.update",
      resourceType: "clinic",
      resourceId: result.clinic.id,
      metadata: {
        name: result.clinic.name,
        slug: result.clinic.slug,
        status: result.clinic.status,
      },
    },
    request,
  );

  return ok(
    {
      accepted: true,
      persisted: result.persisted,
      clinic: result.clinic,
    },
    { status: result.persisted ? 200 : 202 },
  );
}
