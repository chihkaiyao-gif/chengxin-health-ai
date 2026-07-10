import { apiError, ok } from "@/lib/api-response";
import { acceptPatientInvite } from "@/lib/clinic-saas";
import { inviteAcceptSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = inviteAcceptSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid invite code payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await acceptPatientInvite(parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    if (result.error === "NOT_FOUND") {
      return apiError("NOT_FOUND", "Invite code is invalid or expired.", 404);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to accept invite code.",
      500,
      result.details,
    );
  }

  return ok(
    {
      accepted: result.accepted,
      persisted: result.persisted,
      clinicId: result.clinicId,
    },
    { status: result.persisted ? 200 : 202 },
  );
}
