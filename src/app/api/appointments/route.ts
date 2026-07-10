import { apiError, ok } from "@/lib/api-response";
import { createAppointmentForCurrentUser } from "@/lib/appointments";
import { appointmentRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = appointmentRequestSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid appointment request payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await createAppointmentForCurrentUser(parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to create appointment request.",
      500,
      result.details,
    );
  }

  return ok(
    {
      accepted: true,
      persisted: result.persisted,
      appointment: result.appointment,
      safetyNotice: "所有回診建議請由醫師或診所人員評估。",
    },
    { status: result.persisted ? 201 : 202 },
  );
}
