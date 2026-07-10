import { ok } from "@/lib/api-response";
import { getClinicAppointments } from "@/lib/appointments";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const items = await getClinicAppointments();

  return ok({
    persisted: hasSupabaseConfig(),
    items,
    pagination: {
      page: 1,
      pageSize: 100,
      totalItems: items.length,
      totalPages: items.length > 0 ? 1 : 0,
    },
  });
}
