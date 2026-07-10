import { ok } from "@/lib/api-response";
import { getPatientReminderCenter } from "@/lib/reminders";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const reminderCenter = await getPatientReminderCenter();

  return ok({
    persisted: hasSupabaseConfig(),
    reminderCenter,
  });
}
