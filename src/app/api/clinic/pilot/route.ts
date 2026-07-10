import { apiError, ok } from "@/lib/api-response";
import { createPilotCohort, getClinicPilotCohorts } from "@/lib/pilot";
import { pilotCohortCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await getClinicPilotCohorts();

  return ok({
    persisted: result.persisted,
    items: result.items,
    pagination: {
      page: 1,
      pageSize: result.items.length,
      totalItems: result.items.length,
      totalPages: result.items.length > 0 ? 1 : 0,
    },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = pilotCohortCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid pilot cohort payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await createPilotCohort(parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    if (result.error === "FORBIDDEN") {
      return apiError("FORBIDDEN", "You cannot manage pilot cohorts.", 403);
    }

    return apiError("SERVER_ERROR", "Unable to create pilot cohort.", 500, result.details);
  }

  return ok(
    {
      accepted: true,
      persisted: result.persisted,
      cohort: result.cohort,
    },
    { status: result.persisted ? 201 : 202 },
  );
}
