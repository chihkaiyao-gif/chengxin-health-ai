import { apiError, ok } from "@/lib/api-response";
import { getPilotCohortReport } from "@/lib/pilot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    cohortId: string;
  }>;
};

export async function GET(_request: Request, props: RouteParams) {
  const params = await props.params;
  const report = await getPilotCohortReport(params.cohortId);

  if (!report) {
    return apiError("NOT_FOUND", "Pilot cohort not found.", 404);
  }

  return ok(report);
}
