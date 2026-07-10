import { apiError, ok } from "@/lib/api-response";
import { sendDemoNotification } from "@/lib/notifications";
import { notificationSendDemoSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = notificationSendDemoSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid notification payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await sendDemoNotification(parsed.data);

  if ("error" in result) {
    return apiError(
      "SERVER_ERROR",
      "Unable to record demo notification.",
      500,
      result.details,
    );
  }

  return ok(
    {
      accepted: true,
      persisted: result.persisted,
      notificationLog: result.notificationLog,
    },
    { status: result.persisted ? 201 : 202 },
  );
}
