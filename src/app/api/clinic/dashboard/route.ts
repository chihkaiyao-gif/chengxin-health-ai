import { ok } from "@/lib/api-response";
import { getClinicDashboardSummary, getClinicSettings } from "@/lib/clinic-saas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [context, summary] = await Promise.all([
    getClinicSettings(),
    getClinicDashboardSummary(),
  ]);

  return ok({
    persisted: context.persisted && summary.persisted,
    clinic: context.clinic,
    member: context.member,
    permissions: context.permissions,
    summary,
  });
}
