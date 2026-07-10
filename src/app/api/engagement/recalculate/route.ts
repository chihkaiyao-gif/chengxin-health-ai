import { apiError, ok } from "@/lib/api-response";
import { recalculateEngagementForCurrentUser } from "@/lib/patient-engagement";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const result = await recalculateEngagementForCurrentUser();

  if ("error" in result) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  return ok(result);
}
