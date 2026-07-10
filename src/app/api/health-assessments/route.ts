import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { healthAssessmentSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const formData = await request.formData();
  const parsed = healthAssessmentSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid health assessment payload.",
      422,
      parsed.error.flatten(),
    );
  }

  return ok(
    {
      accepted: true,
      userId: user.id,
      next: "Insert into health_assessments and consent_records in the next slice.",
    },
    { status: 202 },
  );
}
