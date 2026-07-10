import { AlertTriangle, Bell, Clock3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { getClinicReminderEvents } from "@/lib/reminders";
import type { ReminderEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const severityStyles = {
  low: "border-slate-200 bg-slate-50 text-slate-700",
  medium: "border-amber-200 bg-amber-50 text-amber-900",
  high: "border-red-200 bg-red-50 text-red-700",
} as const;

export default async function ClinicRemindersPage() {
  const reminders = await getClinicReminderEvents();
  const openReminders = reminders.filter((reminder) => reminder.status === "open");
  const highRisk = openReminders.filter((reminder) => reminder.severity === "high");
  const pendingContact = openReminders.filter((reminder) =>
    ["high_side_effect_alert", "low_engagement", "food_missing"].includes(
      reminder.reminderType,
    ),
  );

  return (
    <ClinicShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-teal-700">提醒中心</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            診所提醒中心
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            集中顯示高風險提醒、待聯絡病人與未完成事項。嚴重不適只提醒請立即就醫或聯絡醫療人員，不自動判斷醫療急症。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ReminderMetric
            icon={AlertTriangle}
            label="高風險提醒"
            value={highRisk.length}
          />
          <ReminderMetric
            icon={Bell}
            label="待聯絡病人"
            value={pendingContact.length}
          />
          <ReminderMetric
            icon={Clock3}
            label="開啟中提醒"
            value={openReminders.length}
          />
        </div>

        <SectionCard title="提醒列表" eyebrow="開啟中提醒">
          {openReminders.length > 0 ? (
            <div className="space-y-3">
              {openReminders.map((reminder) => (
                <ReminderRow key={reminder.id} reminder={reminder} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title="尚無提醒"
              description="目前沒有開啟中的提醒。當病人出現副作用偏高、未回報、GLP-1 即將施打或 InBody 久未更新時，會顯示在這裡。"
              actionLabel="回到診所首頁"
              actionHref="/clinic/dashboard"
            />
          )}
        </SectionCard>
      </div>
    </ClinicShell>
  );
}

function ReminderMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ReminderRow({ reminder }: { reminder: ReminderEvent }) {
  return (
    <article
      className={`rounded-md border p-4 ${severityStyles[reminder.severity]}`}
    >
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="font-semibold">{reminder.title}</p>
          <p className="mt-2 text-sm leading-6">{reminder.message}</p>
          <p className="mt-2 text-xs opacity-80">
            {reminder.patientName || `病人 ${reminder.userId.slice(0, 8)}`} ·{" "}
            {new Date(reminder.createdAt).toLocaleDateString("zh-TW")}
          </p>
        </div>
        <span className="w-fit rounded-md bg-white/70 px-2 py-1 text-xs font-semibold">
          {severityLabel(reminder.severity)}
        </span>
      </div>
    </article>
  );
}

function severityLabel(severity: ReminderEvent["severity"]) {
  const labels = {
    low: "低",
    medium: "中",
    high: "高",
  };

  return labels[severity];
}
