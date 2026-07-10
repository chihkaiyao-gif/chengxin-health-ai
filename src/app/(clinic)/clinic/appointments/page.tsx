import { AlertTriangle, CalendarCheck2, PhoneCall } from "lucide-react";
import { ClinicAppointmentsManager } from "@/components/clinic-appointments-manager";
import { ClinicShell } from "@/components/clinic-shell";
import { SectionHeader, StatCard } from "@/components/premium-ui";
import { getClinicAppointments } from "@/lib/appointments";
import { getClinicReminderEvents } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export default async function ClinicAppointmentsPage() {
  const [appointments, reminders] = await Promise.all([
    getClinicAppointments(),
    getClinicReminderEvents(),
  ]);

  const pendingAppointments = appointments.filter(
    (appointment) => appointment.status === "pending",
  ).length;
  const highRiskReminders = reminders.filter(
    (reminder) => reminder.severity === "high",
  ).length;
  const pendingContact = reminders.filter(
    (reminder) => reminder.status === "open",
  ).length;

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <SectionHeader
            eyebrow="診所排程"
            title="預約管理與提醒中心"
            description="管理待確認、已確認、已取消與已完成的回診需求，並優先處理高風險提醒與待聯絡病人。所有回診建議請由醫師或診所人員評估。"
          />
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={CalendarCheck2}
            label="待確認預約"
            value={pendingAppointments}
            helper="需要診所人員回覆。"
            tone="amber"
          />
          <StatCard
            icon={AlertTriangle}
            label="高風險提醒"
            value={highRiskReminders}
            helper="優先安排聯絡與評估。"
            tone="rose"
          />
          <StatCard
            icon={PhoneCall}
            label="待聯絡病人"
            value={pendingContact}
            helper="包含未回報與回診建議。"
            tone="blue"
          />
        </div>

        <ClinicAppointmentsManager
          initialAppointments={appointments}
          reminders={reminders}
        />
      </div>
    </ClinicShell>
  );
}
