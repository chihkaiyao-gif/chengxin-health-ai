import { Filter, ScrollText, ShieldCheck } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SectionCard } from "@/components/section-card";
import { getClinicAuditLogs } from "@/lib/audit";
import type { AuditLog } from "@/lib/types";
import { auditLogQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type AuditLogsPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

const actionLabels: Record<string, string> = {
  "patient.view": "查看病人資料",
  "patient.update": "修改病人資料",
  "visit_report.generate": "產生 AI 回診報告",
  "glp1_log.create": "新增 GLP-1 紀錄",
  "glp1_side_effect.create": "新增副作用紀錄",
  "clinic_settings.update": "修改診所設定",
  "team_member.invite": "邀請成員",
  "team_member.update": "修改成員",
  "team_member.disable": "停用成員",
  "appointment.update": "修改預約狀態",
  "ai_food_analysis.create": "AI 飲食分析",
  "ai_inbody_analysis.create": "AI InBody 分析",
  "patient_invite.create": "建立病人邀請碼",
};

const resourceTypeLabels: Record<string, string> = {
  patient: "病人資料",
  visit_report: "回診報告",
  clinic_visit_report: "診所回診報告",
  glp1_log: "GLP-1 紀錄",
  glp1_side_effect: "副作用紀錄",
  clinic: "診所設定",
  team_member: "團隊成員",
  appointment: "預約",
  food_photo_analysis: "飲食 AI 分析",
  inbody_scan_analysis: "InBody AI 分析",
  patient_invite: "病人邀請碼",
};

const metadataKeyLabels: Record<string, string> = {
  provider: "來源",
  period: "期間",
  field: "欄位",
  status: "狀態",
  role: "角色",
  persisted: "是否儲存",
  promptVersion: "提示版本",
  promptType: "提示類型",
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

export default async function ClinicAuditLogsPage({
  searchParams,
}: AuditLogsPageProps) {
  const parsed = auditLogQuerySchema.safeParse(flattenSearchParams(searchParams));
  const filters = parsed.success
    ? parsed.data
    : auditLogQuerySchema.parse({ page: 1, pageSize: 50 });
  const result = await getClinicAuditLogs(filters);

  return (
    <ClinicShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-teal-700">操作留痕</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            稽核紀錄
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            追蹤病人資料查看、AI 報告、GLP-1 紀錄、診所設定、團隊與預約狀態變更。只有診所負責人與醫師可查看。
          </p>
        </div>

        <SectionCard
          title="篩選"
          eyebrow="篩選條件"
          action={<Filter className="h-5 w-5 text-teal-700" aria-hidden="true" />}
        >
          <form className="grid gap-4 md:grid-cols-5" method="get">
            <div className="field-stack">
              <label htmlFor="action">操作</label>
              <select id="action" name="action" defaultValue={filters.action || ""}>
                <option value="">全部</option>
                {Object.entries(actionLabels).map(([action, label]) => (
                  <option key={action} value={action}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label htmlFor="actorUserId">操作者 ID</label>
              <input
                id="actorUserId"
                name="actorUserId"
                defaultValue={filters.actorUserId || ""}
                placeholder="UUID"
              />
            </div>
            <div className="field-stack">
              <label htmlFor="targetUserId">對象 ID</label>
              <input
                id="targetUserId"
                name="targetUserId"
                defaultValue={filters.targetUserId || ""}
                placeholder="UUID"
              />
            </div>
            <div className="field-stack">
              <label htmlFor="dateFrom">開始日期</label>
              <input
                id="dateFrom"
                name="dateFrom"
                type="date"
                defaultValue={filters.dateFrom || ""}
              />
            </div>
            <div className="field-stack">
              <label htmlFor="dateTo">結束日期</label>
              <input
                id="dateTo"
                name="dateTo"
                type="date"
                defaultValue={filters.dateTo || ""}
              />
            </div>
            <button type="submit" className="btn-primary md:col-span-5 md:w-fit">
              套用篩選
            </button>
          </form>
        </SectionCard>

        {"error" in result ? (
          <ErrorState
            title="權限不足"
            message="目前角色無法查看操作紀錄。只有診所負責人或醫師可以查看。"
          />
        ) : (
          <SectionCard title="操作紀錄" eyebrow={`共 ${result.totalItems} 筆`}>
            {result.items.length > 0 ? (
              <div className="space-y-3">
                {result.items.map((item) => (
                  <AuditLogRow key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={ScrollText}
                title="尚無操作紀錄"
                description="目前沒有符合條件的稽核紀錄。查看病人資料、產生 AI 回診報告或更新預約後，紀錄會出現在這裡。"
                actionLabel="回到診所首頁"
                actionHref="/clinic/dashboard"
              />
            )}
          </SectionCard>
        )}

        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm leading-6 text-teal-950">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-teal-700" aria-hidden="true" />
            <p>
              操作紀錄不應包含密碼、存取權杖、完整病歷或完整 AI 提示詞；補充資料
              只保留操作摘要，方便營運追蹤與未來稽核匯出。
            </p>
          </div>
        </div>
      </div>
    </ClinicShell>
  );
}

function AuditLogRow({ item }: { item: AuditLog }) {
  const metadataEntries = Object.entries(item.metadata).slice(0, 4);
  const actor = displayPersonName(item.actorName || item.actorUserId || "未知");
  const target = displayPersonName(item.targetName || item.targetUserId || "無");
  const resourceType = resourceTypeLabels[item.resourceType] || item.resourceType;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_160px] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {actionLabels[item.action] || item.action}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            操作者：{actor}
          </p>
        </div>
        <div>
          <p className="text-sm text-slate-600">
            對象：{target}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            資源：{resourceType}
            {item.resourceId ? ` / ${item.resourceId.slice(0, 12)}` : ""}
          </p>
        </div>
        <time className="text-sm text-slate-500" dateTime={item.createdAt}>
          {new Date(item.createdAt).toLocaleString("zh-TW")}
        </time>
      </div>
      {metadataEntries.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {metadataEntries.map(([key, value]) => (
            <span
              key={key}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
            >
              {metadataKeyLabels[key] || key}: {displayMetadataValue(value)}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function displayPersonName(value: string) {
  const labels: Record<string, string> = {
    "Demo Owner": "示範負責人",
    "Demo Doctor": "示範醫師",
    "Demo Staff": "示範診所人員",
    "Demo Patient": "示範病人",
  };

  return labels[value] || value;
}

function displayMetadataValue(value: unknown) {
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }

  if (typeof value !== "string") {
    return String(value);
  }

  const labels: Record<string, string> = {
    demo_fallback: "展示資料",
    openai: "OpenAI",
    ai_cache: "AI 快取",
    "30d": "近 30 天",
    primaryColor: "主色",
    active: "啟用中",
    inactive: "停用",
    pending: "待處理",
    completed: "已完成",
    canceled: "已取消",
    high: "高",
    medium: "中",
    low: "低",
  };

  return labels[value] || value;
}
