import { apiError, ok } from "@/lib/api-response";
import { completeTaskForCurrentUser } from "@/lib/patient-engagement";
import { completeDailyTaskSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { taskId: string } },
) {
  const contentType = request.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await request.json().catch(() => ({}))
    : {};
  const parsed = completeDailyTaskSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid task completion payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await completeTaskForCurrentUser(params.taskId);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    if (result.error === "NOT_FOUND") {
      return apiError("NOT_FOUND", "Task not found.", 404);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to complete this task.",
      500,
      result.details,
    );
  }

  return ok(result);
}
