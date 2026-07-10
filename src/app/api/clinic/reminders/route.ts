import { ok } from "@/lib/api-response";
import { getClinicReminderEvents } from "@/lib/reminders";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const items = await getClinicReminderEvents();

  return ok({
    persisted: hasSupabaseConfig(),
    items,
    summary: {
      highRisk: items.filter((item) => item.severity === "high").length,
      pendingContact: items.filter((item) => item.status === "open").length,
      dueSoon: items.filter((item) => item.reminderType.includes("glp1")).length,
    },
  });
}
