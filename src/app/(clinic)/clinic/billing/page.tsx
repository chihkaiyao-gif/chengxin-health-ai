import {
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import {
  PremiumButton,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import {
  getClinicSettings,
  getClinicSubscription,
  getSubscriptionPlans,
} from "@/lib/clinic-saas";
import { getClinicUsageSummary } from "@/lib/usage";
import type { UsageLimitValue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClinicBillingPage() {
  const [context, plans, subscription, usage] = await Promise.all([
    getClinicSettings(),
    getSubscriptionPlans(),
    getClinicSubscription(),
    getClinicUsageSummary(),
  ]);

  const currentPlanCode = subscription.subscription?.plan?.code || "free";
  const planName = planDisplayName(
    subscription.subscription?.plan?.code || usage.plan?.code || "free",
    subscription.subscription?.plan?.name || usage.plan?.name,
  );

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="方案與用量"
              title="方案與用量限制"
              description="目前先建立 SaaS 方案、用量限制與升級骨架，不串正式金流。健康資料不會放入付款服務的 metadata。"
            />
            <span className="premium-chip px-4 py-3 text-sm font-semibold text-slate-700">
              {context.permissions.canViewBilling ? "可查看帳務" : "權限不足"}
            </span>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={CreditCard}
            label="目前方案"
            value={planName}
            helper={`狀態：${subscriptionStatusLabel(subscription.subscription?.status || "trialing")}`}
          />
          <StatCard
            icon={Users}
            label="病人數"
            value={`${usage.counts.activePatients}`}
            helper={formatLimit(usage.limits.maxPatients)}
            tone="emerald"
          />
          <StatCard
            icon={Sparkles}
            label="AI 回診報告"
            value={`${usage.counts.aiVisitReports}`}
            helper={formatLimit(usage.limits.aiVisitReportsMonthly)}
            tone="blue"
          />
        </div>

        <SectionCard
          title="用量摘要"
          eyebrow="用量限制"
          action={<TrendingUp className="h-5 w-5 text-teal-700" aria-hidden="true" />}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <UsageMeter
              label="病人數"
              value={usage.counts.activePatients}
              limit={usage.limits.maxPatients}
            />
            <UsageMeter
              label="員工數"
              value={usage.counts.staff}
              limit={usage.limits.maxStaff}
            />
            <UsageMeter
              label="AI 飲食分析"
              value={usage.counts.aiFoodAnalysis}
              limit={usage.limits.aiFoodAnalysisMonthly}
            />
            <UsageMeter
              label="AI InBody 分析"
              value={usage.counts.aiInbodyAnalysis}
              limit={usage.limits.aiInbodyAnalysisMonthly}
            />
            <UsageMeter
              label="AI 回診報告"
              value={usage.counts.aiVisitReports}
              limit={usage.limits.aiVisitReportsMonthly}
            />
          </div>
          <p className="mt-4 medical-soft-alert">
            AI 分析次數為每月用量骨架，用於未來串接金流、方案升級與成本控管。
          </p>
        </SectionCard>

        <div className="grid gap-4 xl:grid-cols-4">
          {plans.items.map((plan) => (
            <section
              key={plan.id}
              className={`premium-card p-5 ${
                plan.code === currentPlanCode ? "ring-2 ring-teal-200" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {planDisplayName(plan.code, plan.name)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    方案代碼：{plan.code}
                  </p>
                </div>
                {plan.code === currentPlanCode ? (
                  <CheckCircle2 className="h-5 w-5 text-teal-700" aria-hidden="true" />
                ) : null}
              </div>
              <p className="mt-5 text-3xl font-semibold text-slate-950">
                {plan.priceMonthly > 0
                  ? `NT$ ${plan.priceMonthly.toLocaleString()}`
                  : plan.code === "enterprise"
                    ? "自訂"
                    : "免費"}
              </p>
              <p className="mt-1 text-sm text-slate-500">每月</p>
              <dl className="mt-5 space-y-2 text-sm text-slate-600">
                <PlanRow label="病人上限" value={plan.maxPatients ?? "自訂"} />
                <PlanRow label="人員上限" value={plan.maxStaff ?? "自訂"} />
              </dl>
              <PremiumButton
                type="button"
                icon={CreditCard}
                variant="secondary"
                className="mt-5 w-full"
                disabled
              >
                升級方案
              </PremiumButton>
            </section>
          ))}
        </div>

        <SectionCard
          title="未來商業化付款規劃"
          eyebrow="付款規劃"
          action={<LockKeyhole className="h-5 w-5 text-teal-700" aria-hidden="true" />}
        >
          <p className="text-sm leading-6 text-slate-600">
            未來可接 Stripe、TapPay 或本地金流；需同步加入付款狀態 webhook、發票、合約方案、用量限制與操作紀錄。健康資料不應放入付款服務 metadata。
          </p>
        </SectionCard>
      </div>
    </ClinicShell>
  );
}

function UsageMeter({
  label,
  value,
  limit,
}: {
  label: string;
  value: number;
  limit: UsageLimitValue;
}) {
  const percent =
    limit === null || limit === 0
      ? 0
      : Math.min(Math.round((value / limit) * 100), 100);
  const isNearLimit = limit !== null && percent >= 80;

  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isNearLimit ? "bg-amber-100 text-amber-900" : "bg-white text-slate-600"
          }`}
        >
          {limit === null ? "無上限" : `${percent}%`}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">
        {value}
        <span className="text-sm font-medium text-slate-500">
          {" / "}
          {limit ?? "自訂"}
        </span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div
          className={`h-full rounded-full ${
            isNearLimit ? "bg-amber-500" : "bg-teal-600"
          }`}
          style={{ width: limit === null ? "35%" : `${percent}%` }}
        />
      </div>
    </div>
  );
}

function PlanRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function formatLimit(limit: UsageLimitValue) {
  return limit === null ? "方案為自訂上限" : `上限 ${limit}`;
}

function planDisplayName(code: string, fallback?: string | null) {
  const labels: Record<string, string> = {
    free: "免費版",
    clinic_basic: "診所基本版",
    clinic_pro: "診所專業版",
    enterprise: "企業版",
  };

  return labels[code] || fallback || code;
}

function subscriptionStatusLabel(status: string) {
  const labels: Record<string, string> = {
    trialing: "試用中",
    active: "啟用中",
    past_due: "付款待處理",
    canceled: "已取消",
  };

  return labels[status] || status;
}
