import Link from "next/link";
import { notFound } from "next/navigation";
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
import {
  PremiumButton,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import {
  getPilotCohortDetail,
  getPilotCohortReport,
} from "@/lib/pilot";
import type { FeedbackItem, PilotMemberMetrics } from "@/lib/types";

export const dynamic = "force-dynamic";

type PilotDetailPageProps = {
  params: {
    cohortId: string;
  };
};

const feedbackTypeLabels: Record<FeedbackItem["feedbackType"], string> = {
  bug: "問題",
  idea: "建議",
  confusing: "困惑",
  praise: "稱讚",
};

export default async function PilotDetailPage({ params }: PilotDetailPageProps) {
  const [detail, report] = await Promise.all([
    getPilotCohortDetail(params.cohortId),
    getPilotCohortReport(params.cohortId),
  ]);

  if (!detail || !report) {
    notFound();
  }

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="試用報告"
              title={detail.cohort.name}
              description={
                detail.cohort.goal ||
                "追蹤第一批病人的 14 天登入、紀錄、AI 健康教練與回饋情況。"
              }
            />
            <div className="flex flex-wrap gap-2">
              <span className="premium-chip px-4 py-3 text-sm font-semibold text-slate-700">
                {detail.cohort.startDate} 至 {detail.cohort.endDate}
              </span>
              <PremiumButton href="/clinic/pilot" icon={Target} variant="secondary">
                回試用計畫
              </PremiumButton>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="總人數"
            value={report.totalMembers}
            helper={`狀態：${statusLabel(detail.cohort.status)}`}
          />
          <StatCard
            icon={ClipboardCheck}
            label="活躍率"
            value={`${report.activeRate}%`}
            helper={`平均任務完成率 ${report.averageTaskCompletionRate}%`}
            tone="emerald"
          />
          <StatCard
            icon={Salad}
            label="飲食紀錄率"
            value={`${report.foodLoggingRate}%`}
            helper={`用藥紀錄率 ${report.medicationLoggingRate}%`}
            tone="blue"
          />
          <StatCard
            icon={Bot}
            label="AI 健康教練使用率"
            value={`${report.aiCoachUsageRate}%`}
            helper={`平均回饋 ${report.averageFeedbackCount} 則`}
            tone="amber"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="低黏著名單" eyebrow="追蹤名單">
            {report.lowEngagementMembers.length > 0 ? (
              <div className="space-y-3">
                {report.lowEngagementMembers.map((item) => (
                  <article
                    key={item.userId}
                    className="rounded-3xl bg-amber-50 p-4 text-sm leading-6 text-amber-950 ring-1 ring-amber-100"
                  >
                    <p className="font-semibold">
                      {item.patientName || item.userId}
                    </p>
                    <p className="mt-1">{item.reason}，建議診所人員溫和追蹤。</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="目前沒有低黏著名單"
                description="所有成員都有基本互動。試用期仍建議每週檢查一次。"
              />
            )}
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
            <p className="mt-4 medical-soft-alert">
              試用報告用於產品試用與照護流程優化，不提供診斷，不自動調整藥物；所有醫療與用藥內容請由醫師評估。
            </p>
          </SectionCard>
        </div>

        <SectionCard
          title="成員指標"
          eyebrow="14 天指標"
          action={
            <Link
              href={`/api/clinic/pilot/${detail.cohort.id}/report`}
              className="btn-secondary"
            >
              取得 JSON 報告
            </Link>
          }
        >
          {detail.members.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {detail.members.map((item) => (
                <MemberMetricCard key={item.member.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="尚無成員"
              description="加入 5-10 位試用病人後，這裡會顯示 14 天使用指標。"
              actionLabel="回試用計畫"
              actionHref="/clinic/pilot"
            />
          )}
        </SectionCard>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <SectionCard
            title="試用回饋"
            eyebrow={`${detail.feedbackItems.length} 則`}
            action={<MessageSquareText className="h-5 w-5 text-teal-700" aria-hidden="true" />}
          >
            {detail.feedbackItems.length > 0 ? (
              <div className="space-y-3">
                {detail.feedbackItems.map((item) => (
                  <FeedbackCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={MessageSquareText}
                title="尚無試用回饋"
                description="請試用者使用右下角「回報問題」送出回饋。"
              />
            )}
          </SectionCard>

          <SectionCard title="試用解讀" eyebrow="決策輔助">
            <div className="space-y-3 text-sm leading-6 text-slate-700">
              <InterpretationLine
                icon={ClipboardCheck}
                title="任務完成"
                message={
                  report.averageTaskCompletionRate >= 60
                    ? "平均任務完成率達到可擴大試用的初步門檻。"
                    : "任務完成率偏低，建議先優化新手引導與每日提醒。"
                }
              />
              <InterpretationLine
                icon={Syringe}
                title="用藥紀錄"
                message={
                  report.medicationLoggingRate >= 50
                    ? "GLP-1 紀錄有基本使用，可進一步觀察副作用回報品質。"
                    : "用藥紀錄率偏低，試用前需要更清楚的診所引導。"
                }
              />
              <InterpretationLine
                icon={AlertTriangle}
                title="低黏著"
                message={
                  report.lowEngagementMembers.length > 0
                    ? "有低黏著成員，建議安排診所人員溫和聯絡。"
                    : "目前未見明顯低黏著成員。"
                }
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </ClinicShell>
  );
}

function MemberMetricCard({ item }: { item: PilotMemberMetrics }) {
  return (
    <article className="premium-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">
            {item.member.patientName || item.member.userId}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {item.member.status === "active" ? "試用中" : statusLabel(item.member.status)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
            item.lowEngagement
              ? "bg-amber-50 text-amber-900 ring-amber-100"
              : "bg-teal-50 text-teal-800 ring-teal-100"
          }`}
        >
          {item.lowEngagement ? "低黏著" : "穩定"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label="登入天數" value={`${item.loginDays}`} unit="天" />
        <Metric label="任務完成" value={`${item.taskCompletionRate}`} unit="%" />
        <Metric label="飲食紀錄" value={`${item.foodLogDays}`} unit="天" />
        <Metric label="GLP-1" value={`${item.glp1LogCount}`} unit="筆" />
        <Metric label="AI 健康教練" value={`${item.aiCoachUseCount}`} unit="次" />
        <Metric label="回饋" value={`${item.feedbackCount}`} unit="則" />
      </div>
    </article>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  return (
    <article className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {feedbackTypeLabels[item.feedbackType]} / {item.pagePath}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {item.userName || item.userId.slice(0, 8)} ·{" "}
            {new Date(item.createdAt).toLocaleString("zh-TW")}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {feedbackStatusLabel(item.status)}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{item.message}</p>
    </article>
  );
}

function InterpretationLine({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="flex gap-3 rounded-3xl bg-slate-50 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-teal-700">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1">{message}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">
        {value}
        <span className="ml-1 text-xs text-slate-500">{unit}</span>
      </p>
    </div>
  );
}

function feedbackStatusLabel(status: FeedbackItem["status"]) {
  const labels = {
    open: "待處理",
    reviewed: "已檢視",
    resolved: "已解決",
  };

  return labels[status];
}

function statusLabel(status: string) {
  if (status === "active") {
    return "進行中";
  }

  if (status === "completed") {
    return "已完成";
  }

  if (status === "dropped") {
    return "已退出";
  }

  return "規劃中";
}
