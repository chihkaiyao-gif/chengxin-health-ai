import { apiError, ok } from "@/lib/api-response";
import { generateCoachInsightForCurrentUser } from "@/lib/ai-coach";
import { coachInsightGenerateRequestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = coachInsightGenerateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "AI Coach 請求格式不正確。",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await generateCoachInsightForCurrentUser(parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "請先登入。", 401);
    }

    return apiError(
      "SERVER_ERROR",
      typeof result.details === "string"
        ? result.details
        : "無法產生 AI Coach 建議，請稍後再試。",
      500,
      result.details,
    );
  }

  return ok(result, { status: result.provider === "openai" ? 201 : 202 });
}
