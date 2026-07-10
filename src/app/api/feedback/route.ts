import { apiError, ok } from "@/lib/api-response";
import { createFeedbackForCurrentUser } from "@/lib/feedback";
import { feedbackCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = feedbackCreateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid feedback payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await createFeedbackForCurrentUser(parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    return apiError("SERVER_ERROR", "Unable to submit feedback.", 500, result.details);
  }

  return ok(
    {
      accepted: true,
      persisted: result.persisted,
      feedback: result.feedback,
      notice:
        "Feedback received. Please avoid including passwords, tokens, or full medical records in feedback.",
    },
    { status: result.persisted ? 201 : 202 },
  );
}
