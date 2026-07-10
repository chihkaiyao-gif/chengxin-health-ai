import { apiError, ok } from "@/lib/api-response";
import { getClinicFeedback } from "@/lib/feedback";
import { clinicFeedbackQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = clinicFeedbackQuerySchema.safeParse(params);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid feedback query.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await getClinicFeedback(parsed.data);

  if ("error" in result) {
    return apiError("FORBIDDEN", "You cannot view clinic feedback.", 403);
  }

  return ok({
    persisted: result.persisted,
    items: result.items,
    pagination: {
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      totalItems: result.totalItems,
      totalPages:
        result.totalItems > 0
          ? Math.ceil(result.totalItems / parsed.data.pageSize)
          : 0,
    },
  });
}
