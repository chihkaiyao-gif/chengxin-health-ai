import { apiError, ok } from "@/lib/api-response";
import { getCoachInsightHistoryForCurrentUser } from "@/lib/ai-coach";
import { coachInsightHistoryQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parsed = coachInsightHistoryQuerySchema.safeParse({
    limit: searchParams.get("limit") || undefined,
  });

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid coach insight history query.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await getCoachInsightHistoryForCurrentUser(parsed.data.limit);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to load AI Coach Insight history.",
      500,
      result.details,
    );
  }

  return ok(result);
}
