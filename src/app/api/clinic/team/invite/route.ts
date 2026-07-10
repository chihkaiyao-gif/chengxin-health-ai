import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { getClinicSettings } from "@/lib/clinic-saas";
import { assertClinicUsageLimit } from "@/lib/usage";
import type { StaffInvite } from "@/lib/types";
import { staffInviteInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = staffInviteInputSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid staff invite payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const context = await getClinicSettings();

  if (!context.permissions.canManageTeam) {
    return apiError("FORBIDDEN", "You cannot invite clinic staff.", 403);
  }

  const limit = await assertClinicUsageLimit("maxStaff");

  if (!limit.allowed) {
    return apiError(
      "USAGE_LIMIT_EXCEEDED",
      "Staff limit reached for the current subscription plan.",
      409,
      limit.summary,
    );
  }

  const now = new Date().toISOString();
  const invite: StaffInvite = {
    id: `staff-invite-${crypto.randomUUID()}`,
    clinicId: context.clinic.id,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    role: parsed.data.role,
    status: "invited",
    deliveryChannel: parsed.data.deliveryChannel,
    providerStatus: "demo_sent",
    createdAt: now,
  };

  await logAuditEvent(
    {
      clinicId: context.clinic.id,
      action: "team_member.invite",
      resourceType: "clinic_member_invite",
      resourceId: invite.id,
      metadata: {
        role: invite.role,
        deliveryChannel: invite.deliveryChannel,
        providerStatus: invite.providerStatus,
        emailPresent: Boolean(invite.email),
        phonePresent: Boolean(invite.phone),
      },
    },
    request,
  );

  return ok(
    {
      accepted: true,
      persisted: false,
      invite,
      deliveryNotice:
        "Email / LINE provider is a skeleton. No production message was sent.",
    },
    { status: 202 },
  );
}
