import { apiError, ok } from "@/lib/api-response";
import { logAuditEvent } from "@/lib/audit";
import { updateClinicAppointment } from "@/lib/appointments";
import { clinicAppointmentUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: { appointmentId: string } },
) {
  const body = await request.json().catch(() => null);
  const parsed = clinicAppointmentUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid appointment update payload.",
      422,
      parsed.error.flatten(),
    );
  }

  const result = await updateClinicAppointment(params.appointmentId, parsed.data);

  if ("error" in result) {
    if (result.error === "UNAUTHENTICATED") {
      return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
    }

    return apiError(
      "SERVER_ERROR",
      "Unable to update appointment.",
      500,
      result.details,
    );
  }

  if (!result.appointment) {
    return apiError("SERVER_ERROR", "Appointment not found.", 404);
  }

  await logAuditEvent(
    {
      clinicId: result.appointment.clinicId,
      targetUserId: result.appointment.userId,
      action: "appointment.update",
      resourceType: "appointment",
      resourceId: result.appointment.id,
      metadata: {
        status: result.appointment.status,
        preferredDate: result.appointment.preferredDate,
      },
    },
    request,
  );

  return ok({
    accepted: true,
    persisted: result.persisted,
    appointment: result.appointment,
  });
}
