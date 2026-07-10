import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { mealPhotoSchema } from "@/lib/validation";

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
  const photo = formData.get("mealPhoto");
  const parsed = mealPhotoSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid meal photo payload.",
      422,
      parsed.error.flatten(),
    );
  }

  if (!(photo instanceof File) || photo.size === 0) {
    return apiError("VALIDATION_ERROR", "Meal photo is required.", 422);
  }

  return ok(
    {
      accepted: true,
      userId: user.id,
      file: { name: photo.name, size: photo.size, type: photo.type },
      next: "Upload to Supabase Storage bucket meal-photos/{userId}/... and insert meal_logs.",
    },
    { status: 202 },
  );
}
