import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { createClinicInvite, getClinicInvites } from "@/lib/clinic-saas";
import { assertClinicUsageLimit } from "@/lib/usage";
import { clinicInviteCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await getClinicInvites();

  return ok({
    persisted: result.persisted,
    items: result.items,
    pagination: {
      page: 1,
      pageSize: 50,
      totalItems: result.items.length,
      totalPages: result.items.length > 0 ? 1 : 0,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = clinicInviteCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid patient invite payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const limit = await assertClinicUsageLimit("maxPatients");

  if (!limit.allowed) {
    return apiError(
      "USAGE_LIMIT_EXCEEDED",
      "Patient limit reached for the current subscription plan.",
      409,
      limit.summary,
    );
  }

  const result = await createClinicInvite(parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    if (result.error === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot create patient invites.", 403);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to create patient invite.",
      500,
      result.details,
    );
  }

  await logAuditEvent(
    {
      clinicId: result.invite.clinicId,
      action: "patient_invite.create",
      resourceType: "patient_invite",
      resourceId: result.invite.id,
      metadata: {
        inviteCode: result.invite.inviteCode,
        invitedEmailPresent: Boolean(result.invite.invitedEmail),
        invitedPhonePresent: Boolean(result.invite.invitedPhone),
      },
    },
    request,
  );

  return ok(
    {
      accepted: true,
      persisted: result.persisted,
      invite: result.invite,
    },
    { status: result.persisted ? 201 : 202 },
  );
}
