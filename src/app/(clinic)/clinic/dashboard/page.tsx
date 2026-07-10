import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  FileText,
  Syringe,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import {
  PremiumButton,
  ReminderCard,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import { getClinicDashboardSummary, getClinicSettings } from "@/lib/clinic-saas";

export const dynamic = "force-dynamic";

export default async function ClinicDashboardPage() {
  const [context, summary] = await Promise.all([
    getClinicSettings(),
    getClinicDashboardSummary(),
  ]);

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="診所首頁"
              title={context.clinic.name}
              description="快速掌握病人活躍度、GLP-1 提醒、副作用警示、預約與最近 AI 回診報告。醫療與用藥相關判讀仍請由醫師評估。"
            />
            <div className="flex flex-wrap gap-2">
              <span className="premium-chip px-4 py-3 text-sm font-semibold text-slate-700">
                {context.persisted ? "正式資料" : "展示資料"}
              </span>
              <PremiumButton href="/clinic/patients" icon={Users} variant="secondary">
                查看病人
              </PremiumButton>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            icon={Users}
            label="總病人數"
            value={summary.totalPatients}
            helper="目前關聯在此診所的啟用中病人。"
          />
          <StatCard
            icon={UserRoundCheck}
            label="本週活躍病人"
            value={summary.activePatientsThisWeek}
            helper="近 7 天有紀錄或互動。"
            tone="emerald"
          />
          <StatCard
            icon={AlertTriangle}
            label="高副作用警示"
            value={summary.highSideEffectAlerts}
            helper="建議優先安排回診溝通，請由醫師評估。"
            tone="rose"
          />
          <StatCard
            icon={CalendarClock}
            label="待確認預約"
            value={summary.pendingAppointments}
            helper="需要診所人員確認。"
            tone="amber"
          />
          <StatCard
            icon={ClipboardList}
            label="7 天未登入"
            value={summary.inactivePatients7d}
            helper="低黏著追蹤名單。"
            tone="blue"
          />
          <StatCard
            icon={Syringe}
            label="GLP-1 即將施打"
            value={summary.glp1DueSoon}
            helper="距離下次施打日 1 天內。"
            tone="amber"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <ReminderCard
            icon={AlertTriangle}
            tone={summary.highSideEffectAlerts > 0 ? "rose" : "teal"}
            title={
              summary.highSideEffectAlerts > 0
                ? "有病人需要優先關注"
                : "目前沒有高副作用警示"
            }
            message="所有回診建議請由醫師或診所人員評估；若病人回報嚴重不適，請提醒立即就醫或聯絡醫療人員。"
            actionHref="/clinic/reminders"
            actionLabel="查看提醒中心"
          />

          <SectionCard title="最近 AI 回診報告" eyebrow="回診報告">
            {summary.recentVisitReports.length > 0 ? (
              <div className="space-y-3">
                {summary.recentVisitReports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-3xl bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">
                          病人 {report.patientId.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {report.reportPeriodStart} 至 {report.reportPeriodEnd}
                        </p>
                      </div>
                      <FileText className="h-5 w-5 text-teal-700" aria-hidden="true" />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                      {report.plainTextSummary}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                尚未產生 AI 回診報告。可從病人詳情頁建立近 30 天摘要。
              </p>
            )}
          </SectionCard>
        </div>
      </div>
    </ClinicShell>
  );
}
