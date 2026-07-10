import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { updateClinicMember } from "@/lib/clinic-saas";
import { clinicMemberUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { memberId: string } },
) {
  const body = await request.json().catch(() => null);
  const parsed = clinicMemberUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid clinic member update payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await updateClinicMember(params.memberId, parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    if (result.error === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage this clinic team.", 403);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to update clinic member.",
      500,
      result.details,
    );
  }

  if (!result.member) {
    return apiError("NOT_FOUND", "Clinic member not found.", 404);
  }

  await logAuditEvent(
    {
      clinicId: result.member.clinicId,
      targetUserId: result.member.userId,
      action:
        result.member.status === "disabled"
          ? "team_member.disable"
          : "team_member.update",
      resourceType: "clinic_member",
      resourceId: result.member.id,
      metadata: {
        role: result.member.role,
        status: result.member.status,
      },
    },
    request,
  );

  return ok({
    accepted: true,
    persisted: result.persisted,
    member: result.member,
  });
}
