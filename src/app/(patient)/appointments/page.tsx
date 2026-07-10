import { BellRing, CalendarClock, ClipboardCheck, MessageCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AppointmentRequestForm } from "@/components/appointment-request-form";
import { EmptyState } from "@/components/empty-state";
import {
  PremiumButton,
  ReminderCard,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import { getAppointmentsForCurrentUser } from "@/lib/appointments";
import { getPatientReminderCenter } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const [appointments, reminderCenter] = await Promise.all([
    getAppointmentsForCurrentUser(),
    getPatientReminderCenter(),
  ]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <SectionHeader
            eyebrow="回診預約"
            title="需要回診時，先把原因整理好"
            description="你可以因 GLP-1 即將用完、副作用偏高、未回報或其他需求送出回診請求。所有回診建議請由醫師或診所人員評估。"
            action={
              <PremiumButton href="#appointment-request" icon={CalendarClock} size="lg">
                送出需求
              </PremiumButton>
            }
          />
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={BellRing}
            label="今日提醒"
            value={reminderCenter.todayReminders.length}
            helper="包含用藥、紀錄與回診提醒。"
          />
          <StatCard
            icon={CalendarClock}
            label="回診建議"
            value={reminderCenter.visitSuggestions.length}
            helper="請由醫師或診所人員評估。"
            tone="amber"
          />
          <StatCard
            icon={ClipboardCheck}
            label="未完成事項"
            value={reminderCenter.incompleteItems.length}
            helper="補上紀錄可讓回診摘要更完整。"
            tone="blue"
          />
        </div>

        <SectionCard title="今日提醒" eyebrow="通知中心">
          {reminderCenter.todayReminders.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-3">
              {reminderCenter.todayReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  icon={BellRing}
                  title={reminder.title}
                  message={reminder.message}
                  tone={reminder.severity === "high" ? "amber" : "teal"}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BellRing}
              title="尚無提醒"
              description="目前沒有新的提醒。若出現回診建議、GLP-1 即將施打或未完成事項，系統會顯示在這裡。"
              actionLabel="回到首頁"
              actionHref="/dashboard"
            />
          )}
        </SectionCard>

        <ReminderCard
          icon={MessageCircle}
          title="回診建議不是診斷"
          message="系統不自動判斷醫療急症；若出現嚴重症狀，請立即就醫或聯絡醫療人員。"
          tone="amber"
        />

        <div id="appointment-request">
          <AppointmentRequestForm
            initialAppointments={appointments}
            reminderCenter={reminderCenter}
          />
        </div>
      </div>
    </AppShell>
  );
}
