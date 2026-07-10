import { apiError, ok } from "@/lib/api-response";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { trainingLogSchema } from "@/lib/validation";

export async function GET() {
  if (!hasSupabaseConfig()) {
    return ok({
      persisted: false,
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });
  }

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
  const formData = await request.formData();
  const parsed = trainingLogSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid training log payload.",
      422,
      parsed.error.flatten(),
    );
  }

  if (!hasSupabaseConfig()) {
    return ok(
      {
        accepted: true,
        persisted: false,
        userId: "demo-user",
        payload: parsed.data,
        safetyNotice:
          "Demo mode: Supabase is not configured. The training log was validated but not saved.",
      },
      { status: 202 },
    );
  }

  const { user } = await getCurrentUser();

  if (!user) {
    return apiError("UNAUTHENTICATED", "Please sign in first.", 401);
  }

  return ok(
    {
      accepted: true,
      userId: user.id,
      payload: parsed.data,
      next: "Insert into training_logs after Supabase project is connected.",
    },
    { status: 202 },
  );
}
