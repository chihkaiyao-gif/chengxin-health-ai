import { ok } from "@/lib/api-response";
import { getClinicTeam } from "@/lib/clinic-saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const result = await getClinicTeam();

  return ok({
    persisted: result.persisted,
    items: result.items,
    pagination: {
      page: 1,
      pageSize: 100,
      totalItems: result.items.length,
      totalPages: result.items.length > 0 ? 1 : 0,
    },
  });
}
