import { apiError, ok } from "@/lib/api-response";
import { addPilotCohortMember } from "@/lib/pilot";
import { pilotCohortMemberAddSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteParams = {
  params: {
    cohortId: string;
  };
};

export async function POST(request: Request, { params }: RouteParams) {
  const body = await request.json().catch(() => null);
  const parsed = pilotCohortMemberAddSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid pilot member payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await addPilotCohortMember(params.cohortId, parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    if (result.error === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage pilot members.", 403);
    }

    return apiError("SERVER_ERROR", "Unable to add pilot member.", 500, result.details);
  }

  return ok(
    {
      accepted: true,
      persisted: result.persisted,
      member: result.member,
    },
    { status: result.persisted ? 201 : 202 },
  );
}
