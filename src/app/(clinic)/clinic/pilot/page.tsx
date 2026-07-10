import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  ClipboardCheck,
  MessageSquareText,
  Salad,
  Syringe,
  Target,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { EmptyState } from "@/components/empty-state";
import { PilotCohortManager } from "@/components/pilot-cohort-manager";
import {
  PremiumButton,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import {
  getClinicPilotCohorts,
  getPilotCohortDetail,
  getPilotCohortReport,
} from "@/lib/pilot";
import type { PilotMemberMetrics } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClinicPilotPage() {
  const cohorts = await getClinicPilotCohorts();
  const activeCohort =
    cohorts.items.find((cohort) => cohort.status === "active") || cohorts.items[0];
  const [detail, report] = activeCohort
    ? await Promise.all([
        getPilotCohortDetail(activeCohort.id),
        getPilotCohortReport(activeCohort.id),
      ])
    : [null, null];

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="試用計畫"
              title="第一批病人 14 天試用"
              description="建立 5-10 位試用病人的試用計畫，追蹤登入、任務完成、飲食、GLP-1、AI 健康教練與回饋，協助診所判斷是否適合擴大試用。"
            />
            <div className="flex flex-wrap gap-2">
              <PremiumButton href="/clinic/feedback" icon={MessageSquareText} variant="secondary">
                查看回饋
              </PremiumButton>
              {activeCohort ? (
                <PremiumButton href={`/clinic/pilot/${activeCohort.id}`} icon={Target}>
                  試用報告
                </PremiumButton>
              ) : null}
            </div>
          </div>
        </section>

        {report ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Users}
              label="總人數"
              value={report.totalMembers}
              helper={`${report.cohort.startDate} 至 ${report.cohort.endDate}`}
            />
            <StatCard
              icon={ClipboardCheck}
              label="平均任務完成率"
              value={`${report.averageTaskCompletionRate}%`}
              helper={`活躍率 ${report.activeRate}%`}
              tone="emerald"
            />
            <StatCard
              icon={Salad}
              label="飲食紀錄率"
              value={`${report.foodLoggingRate}%`}
              helper="至少有一天飲食紀錄的病人比例。"
              tone="blue"
            />
            <StatCard
              icon={AlertTriangle}
              label="低黏著名單"
              value={report.lowEngagementMembers.length}
              helper="登入或任務完成率偏低。"
              tone={report.lowEngagementMembers.length > 0 ? "amber" : "teal"}
            />
          </div>
        ) : null}

        <SectionCard title="建立與加入病人" eyebrow="設定">
          <PilotCohortManager initialCohorts={cohorts.items} />
        </SectionCard>

        <SectionCard title="試用計畫清單" eyebrow="計畫列表">
          {cohorts.items.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {cohorts.items.map((cohort) => (
                <Link
                  key={cohort.id}
                  href={`/clinic/pilot/${cohort.id}`}
                  className="premium-card completed-pop block p-4 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{cohort.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {cohort.startDate} 至 {cohort.endDate}
                      </p>
                    </div>
                    <StatusPill status={cohort.status} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                    {cohort.goal || "尚未填寫試用目標。"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="尚無試用計畫"
              description="先建立一個 14 天試用計畫，再加入 5-10 位病人。"
            />
          )}
        </SectionCard>

        <SectionCard title="目前試用病人" eyebrow={detail?.cohort.name || "成員"}>
          {detail && detail.members.length > 0 ? (
            <>
              <div className="grid gap-4 lg:hidden">
                {detail.members.map((item) => (
                  <PilotMemberCard key={item.member.id} item={item} />
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1060px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="rounded-l-2xl bg-slate-50 px-4 py-3 font-semibold">
                        病人
                      </th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">登入天數</th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">任務完成率</th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">飲食天數</th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">GLP-1</th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">AI 健康教練</th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">回饋</th>
                      <th className="rounded-r-2xl bg-slate-50 px-4 py-3 font-semibold">
                        狀態
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.members.map((item) => (
                      <PilotMemberRow key={item.member.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="尚無試用成員"
              description="加入第一批 5-10 位試用病人後，登入天數、任務完成率、飲食、用藥、AI 健康教練和回饋會顯示在這裡。"
            />
          )}
        </SectionCard>

        {report ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title="AI 健康教練與用藥使用率" eyebrow="使用率">
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricTile
                  icon={Bot}
                  label="AI 健康教練使用率"
                  value={`${report.aiCoachUsageRate}%`}
                />
                <MetricTile
                  icon={Syringe}
                  label="用藥紀錄率"
                  value={`${report.medicationLoggingRate}%`}
                />
              </div>
            </SectionCard>

            <SectionCard title="常見問題摘要" eyebrow="回饋摘要">
              <div className="space-y-3">
                {report.commonFeedbackSummary.map((item) => (
                  <p
                    key={item}
                    className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}
      </div>
    </ClinicShell>
  );
}

function PilotMemberCard({ item }: { item: PilotMemberMetrics }) {
  return (
    <article className="premium-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">
            {item.member.patientName || item.member.userId}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            任務完成率 {item.taskCompletionRate}%
          </p>
        </div>
        <EngagementPill low={item.lowEngagement} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <MiniMetric label="登入" value={`${item.loginDays} 天`} />
        <MiniMetric label="飲食" value={`${item.foodLogDays} 天`} />
        <MiniMetric label="GLP-1" value={`${item.glp1LogCount} 筆`} />
        <MiniMetric label="AI 健康教練" value={`${item.aiCoachUseCount} 次`} />
        <MiniMetric label="回饋" value={`${item.feedbackCount} 則`} />
      </div>
    </article>
  );
}

function PilotMemberRow({ item }: { item: PilotMemberMetrics }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-4 font-semibold text-slate-950">
        {item.member.patientName || item.member.userId}
      </td>
      <td className="px-4 py-4 text-slate-600">{item.loginDays} 天</td>
      <td className="px-4 py-4 text-slate-600">{item.taskCompletionRate}%</td>
      <td className="px-4 py-4 text-slate-600">{item.foodLogDays} 天</td>
      <td className="px-4 py-4 text-slate-600">{item.glp1LogCount} 筆</td>
      <td className="px-4 py-4 text-slate-600">{item.aiCoachUseCount} 次</td>
      <td className="px-4 py-4 text-slate-600">{item.feedbackCount} 則</td>
      <td className="px-4 py-4">
        <EngagementPill low={item.lowEngagement} />
      </td>
    </tr>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <Icon className="h-5 w-5 text-teal-700" aria-hidden="true" />
      <p className="mt-3 text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "active" ? "進行中" : status === "completed" ? "已完成" : "規劃中";
  const classes =
    status === "active"
      ? "bg-teal-50 text-teal-800 ring-teal-100"
      : status === "completed"
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : "bg-amber-50 text-amber-900 ring-amber-100";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes}`}>
      {label}
    </span>
  );
}

function EngagementPill({ low }: { low: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
        low
          ? "bg-amber-50 text-amber-900 ring-amber-100"
          : "bg-teal-50 text-teal-800 ring-teal-100"
      }`}
    >
      {low ? "低黏著" : "穩定"}
    </span>
  );
}
