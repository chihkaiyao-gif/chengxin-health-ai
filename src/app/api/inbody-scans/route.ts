import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { inbodyScanSchema } from "@/lib/validation";

export async function GET() {
  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  return ok({
    items: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
  });
}

export async function POST(request: Request) {
  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  const formData = await request.formData();
  const photo = formData.get("inbodyPhoto");
  const parsed = inbodyScanSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid InBody scan payload.",
      422,
      parsed.error.flatten(),
    );
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return apiError("VALIDATION_ERROR", "InBody photo is required.", 422);
  }

  return ok(
    {
      accepted: true,
      userId: user.id,
      file: { name: photo.name, size: photo.size, type: photo.type },
      next: "Upload to Supabase Storage bucket inbody-scans/{userId}/... and insert inbody_scans.",
    },
    { status: 202 },
  );
}
