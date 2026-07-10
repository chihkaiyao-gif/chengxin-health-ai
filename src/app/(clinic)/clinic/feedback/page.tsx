import { Filter, MessageSquareText, Search } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SectionCard } from "@/components/section-card";
import { getClinicFeedback } from "@/lib/feedback";
import type { FeedbackItem, FeedbackStatus, FeedbackType } from "@/lib/types";
import { clinicFeedbackQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type ClinicFeedbackPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const typeLabels: Record<FeedbackType, string> = {
  bug: "問題",
  idea: "建議",
  confusing: "困惑",
  praise: "稱讚",
};

const statusLabels: Record<FeedbackStatus, string> = {
  open: "待處理",
  reviewed: "已查看",
  resolved: "已解決",
};

function flattenSearchParams(
  params: Record<string, string | string[] | undefined> = {},
) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}

export default async function ClinicFeedbackPage({
  searchParams,
}: ClinicFeedbackPageProps) {
  const parsed = clinicFeedbackQuerySchema.safeParse(
    flattenSearchParams(searchParams),
  );
  const filters = parsed.success
    ? parsed.data
    : clinicFeedbackQuerySchema.parse({ page: 1, pageSize: 50 });
  const result = await getClinicFeedback(filters);

  const feedbackResult = "error" in result ? null : result;
  const items = feedbackResult?.items ?? [];
  const openCount = items.filter((item) => item.status === "open").length;
  const bugCount = items.filter((item) => item.feedbackType === "bug").length;

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-700">試用回饋</p>
              <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
                試用回饋
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                收集病人、醫師、營養師、護理師與診所人員在內部試用期間回報的問題、想法與困惑。請勿在回饋內容保存完整病歷、密碼或 token。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="premium-chip px-4 py-3 text-sm font-semibold text-slate-700">
                待處理 {openCount}
              </span>
              <span className="premium-chip px-4 py-3 text-sm font-semibold text-slate-700">
                問題 {bugCount}
              </span>
            </div>
          </div>
        </section>

        <SectionCard
          title="篩選"
          eyebrow="篩選條件"
          action={<Filter className="h-5 w-5 text-teal-700" aria-hidden="true" />}
        >
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" method="get">
            <div className="field-stack">
              <label htmlFor="feedbackType">類型</label>
              <select
                id="feedbackType"
                name="feedbackType"
                defaultValue={filters.feedbackType || ""}
              >
                <option value="">全部</option>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label htmlFor="status">狀態</label>
              <select id="status" name="status" defaultValue={filters.status || ""}>
                <option value="">全部</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary self-end">
              <Search className="h-4 w-4" aria-hidden="true" />
              套用
            </button>
          </form>
        </SectionCard>

        {"error" in result ? (
          <ErrorState
            title="權限不足"
            message="目前角色無法查看診所試用回饋，請確認你是診所成員。"
          />
        ) : (
          <SectionCard title="回饋清單" eyebrow={`${result.totalItems} 則`}>
            {result.items.length > 0 ? (
              <>
                <div className="grid gap-4 lg:hidden">
                  {result.items.map((item) => (
                    <FeedbackCard key={item.id} item={item} />
                  ))}
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="rounded-l-2xl bg-slate-50 px-4 py-3 font-semibold">
                          類型
                        </th>
                        <th className="bg-slate-50 px-4 py-3 font-semibold">頁面</th>
                        <th className="bg-slate-50 px-4 py-3 font-semibold">
                          回報者
                        </th>
                        <th className="bg-slate-50 px-4 py-3 font-semibold">
                          內容
                        </th>
                        <th className="bg-slate-50 px-4 py-3 font-semibold">
                          狀態
                        </th>
                        <th className="rounded-r-2xl bg-slate-50 px-4 py-3 font-semibold">
                          時間
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.items.map((item) => (
                        <FeedbackRow key={item.id} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <EmptyState
                icon={MessageSquareText}
                title="尚無回饋"
                description="當試用者按右下角「回報問題」送出後，內容會出現在這裡。"
                actionLabel="打開試用檢查表"
                actionHref="/clinic/demo-checklist"
              />
            )}
          </SectionCard>
        )}
      </div>
    </ClinicShell>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  return (
    <article className="premium-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950">
            {typeLabels[item.feedbackType]}
          </p>
          <p className="mt-1 text-sm text-slate-500">{item.pagePath}</p>
        </div>
        <StatusPill status={item.status} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-700">{item.message}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
        <span>{item.userName || item.userId.slice(0, 8)}</span>
        <span>{new Date(item.createdAt).toLocaleString("zh-TW")}</span>
      </div>
    </article>
  );
}

function FeedbackRow({ item }: { item: FeedbackItem }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-4 font-semibold text-slate-950">
        {typeLabels[item.feedbackType]}
      </td>
      <td className="px-4 py-4 text-slate-600">{item.pagePath}</td>
      <td className="px-4 py-4 text-slate-600">
        {item.userName || item.userId.slice(0, 8)}
      </td>
      <td className="max-w-md px-4 py-4 text-slate-600">
        <span className="line-clamp-2">{item.message}</span>
        {item.screenshotUrl ? (
          <a
            href={item.screenshotUrl}
            className="mt-1 inline-flex text-xs font-semibold text-teal-700"
            target="_blank"
            rel="noreferrer"
          >
            截圖連結
          </a>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <StatusPill status={item.status} />
      </td>
      <td className="px-4 py-4 text-slate-500">
        {new Date(item.createdAt).toLocaleString("zh-TW")}
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  const classes = {
    open: "bg-amber-50 text-amber-900 ring-amber-100",
    reviewed: "bg-blue-50 text-blue-800 ring-blue-100",
    resolved: "bg-teal-50 text-teal-800 ring-teal-100",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
