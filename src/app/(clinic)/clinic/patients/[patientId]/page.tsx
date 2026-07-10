import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Dumbbell,
  HeartPulse,
  Scale,
  ShieldAlert,
  Syringe,
  TrendingUp,
  User,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AiCoachCard } from "@/components/ai-coach-card";
import { ClinicShell } from "@/components/clinic-shell";
import { ClinicVisitReportGenerator } from "@/components/clinic-visit-report-generator";
import {
  SectionHeader,
  StatCard,
  TrendCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import { getLatestCoachInsightForPatient } from "@/lib/ai-coach";
import { logAuditEvent } from "@/lib/audit";
import { getClinicPatientDetail } from "@/lib/clinic-patient";
import type {
  AssessmentPersona,
  Glp1MedicationName,
  TrendPoint,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const riskLabel = {
  LOW: "穩定",
  WATCH: "觀察",
  NEEDS_REVIEW: "需回診評估",
};

const personaLabels: Record<AssessmentPersona, string> = {
  fitness_beginner: "健身初學者",
  gym_training: "健身房訓練",
  home_training: "居家訓練",
  glp1_weight_loss: "GLP-1 減重照護",
  chronic_disease: "慢性病安全管理",
  senior_frailty: "銀髮肌力與防跌",
  high_risk_medical_review: "高風險，需專業評估",
};

const medicationLabels: Record<Glp1MedicationName, string> = {
  MOUNJARO: "猛健樂 Mounjaro",
  OZEMPIC: "Ozempic",
  WEGOVY: "Wegovy",
  SAXENDA: "Saxenda／瘦瘦筆",
  OTHER: "其他 GLP-1",
};

const glp1SevereNotice =
  "若出現嚴重不適、持續嘔吐、脫水疑慮、嚴重腹痛、暈厥或低血糖感，請立即就醫或聯絡醫療人員，並請由醫師評估。";

export default async function ClinicPatientDetailPage({
  params,
}: {
  params: { patientId: string };
}) {
  const [detail, coachInsight] = await Promise.all([
    getClinicPatientDetail(params.patientId),
    getLatestCoachInsightForPatient(params.patientId),
  ]);

  if (!detail) {
    notFound();
  }

  await logAuditEvent({
    targetUserId: detail.patient.id,
    action: "patient.view",
    resourceType: "patient",
    resourceId: detail.patient.id,
    metadata: { source: "clinic_patient_detail_page" },
  });

  const latestGlp1 = detail.glp1.latestMedicationLog;
  const latestSideEffect = detail.glp1.latestSideEffectLog;
  const riskAlerts = buildCleanRiskAlerts(detail);
  const persona = detail.latestAssessment?.persona || null;

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <Link
            href="/clinic/patients"
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回病人列表
          </Link>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="病人詳情"
              title={detail.patient.fullName}
              description="快速掌握近期體重、飲食、InBody、GLP-1、副作用、訓練與黏著度。此頁僅供照護追蹤與回診溝通輔助，不提供診斷或自動調藥。"
            />
            <span className="premium-chip px-4 py-3 text-sm font-semibold text-slate-700">
              {riskLabel[detail.patient.riskFlag]}
            </span>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={User}
            label="基本資料"
            value={`${detail.patient.age ?? "未填"} 歲`}
            helper={`性別：${detail.patient.sex || "未填"}`}
          />
          <StatCard
            icon={HeartPulse}
            label="最新 persona"
            value={persona ? personaLabels[persona] : "尚未評估"}
            helper={detail.latestAssessment?.recommendedPath || "待完成初始健康評估"}
            tone="emerald"
          />
          <StatCard
            icon={Scale}
            label="最新 InBody"
            value={
              detail.inbody.latest?.weightKg
                ? `${detail.inbody.latest.weightKg}`
                : "尚未紀錄"
            }
            unit={detail.inbody.latest?.weightKg ? "kg" : undefined}
            helper={
              detail.inbody.latest
                ? `體脂 ${formatNullable(detail.inbody.latest.bodyFatPercentage, "%")}，骨骼肌 ${formatNullable(detail.inbody.latest.skeletalMuscleKg, "kg")}`
                : "待上傳 InBody"
            }
            tone="blue"
          />
          <StatCard
            icon={CalendarClock}
            label="未回報天數"
            value={
              detail.glp1.daysUnreported === null
                ? "尚未回報"
                : `${detail.glp1.daysUnreported}`
            }
            unit={detail.glp1.daysUnreported === null ? undefined : "天"}
            helper="副作用或用藥回報"
            tone="amber"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          {coachInsight ? (
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                最近 AI 健康教練
              </p>
              <AiCoachCard initialInsight={coachInsight} compact />
            </div>
          ) : (
            <SectionCard title="最近 AI 健康教練" eyebrow="最近建議">
              <div className="premium-card p-5 text-sm leading-6 text-slate-600">
                尚無 AI 健康教練建議。病人端產生今日建議後，診所端會在此查看最近摘要。
              </div>
            </SectionCard>
          )}

          <SectionCard title="風險提示" eyebrow="照護警示">
            {riskAlerts.length > 0 ? (
              <div className="space-y-3">
                {riskAlerts.map((alert) => (
                  <div
                    key={alert}
                    className="rounded-3xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-100"
                  >
                    <p className="inline-flex items-center gap-2 font-semibold">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      {alert}
                    </p>
                    <p className="mt-1">請由醫師或診所人員評估。</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                目前沒有高優先警示；醫療判斷與用藥調整仍請由醫師評估。
              </p>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="InBody 趨勢追蹤" eyebrow="身體組成趨勢">
            <div className="grid gap-4 md:grid-cols-3">
              <TrendBlock
                title="體重"
                unit="kg"
                points={detail.inbody.weightTrend}
              />
              <TrendBlock
                title="體脂率"
                unit="%"
                points={detail.inbody.bodyFatTrend}
              />
              <TrendBlock
                title="骨骼肌"
                unit="kg"
                points={detail.inbody.skeletalMuscleTrend}
              />
            </div>
          </SectionCard>

          <TrendCard
            title="黏著度"
            value={`${detail.engagement.healthScore} 分`}
            delta={`連續登入 ${detail.engagement.consecutiveLoginDays} 天`}
            helper={`7 天完成率 ${detail.engagement.completionRate7d}%，30 天完成率 ${detail.engagement.completionRate30d}%。`}
          >
            <div className="mt-4 space-y-2 text-sm leading-6">
              <EngagementAlert
                icon={ShieldAlert}
                active={detail.engagement.lowEngagementAlert}
                label="低黏著警示：7 天未登入"
              />
              <EngagementAlert
                icon={Utensils}
                active={detail.engagement.foodMissingAlert}
                label="飲食未記錄警示：3 天未記錄"
              />
              <EngagementAlert
                icon={Syringe}
                active={detail.engagement.glp1MissingAlert}
                label="GLP-1 未回報警示"
              />
            </div>
          </TrendCard>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <WindowMetric
            icon={Utensils}
            label="7 天飲食"
            value={`${detail.nutrition.summary7d.logCount} 筆`}
            helper={`平均蛋白質 ${detail.nutrition.summary7d.averageProteinG}g/日`}
          />
          <WindowMetric
            icon={Utensils}
            label="30 天飲食"
            value={`${detail.nutrition.summary30d.proteinTargetRate}%`}
            helper="蛋白質達標率"
          />
          <WindowMetric
            icon={Dumbbell}
            label="7 天訓練"
            value={`${detail.training.summary7d.executionRate}%`}
            helper={`${detail.training.summary7d.workoutCount} 次，${detail.training.summary7d.totalMinutes} 分鐘`}
          />
          <WindowMetric
            icon={Dumbbell}
            label="30 天訓練"
            value={`${detail.training.summary30d.executionRate}%`}
            helper={`${detail.training.summary30d.workoutCount} 次，${detail.training.summary30d.totalMinutes} 分鐘`}
          />
        </div>

        <SectionCard title="GLP-1 與副作用" eyebrow="用藥紀錄">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SmallStat
                label="最近施打"
                value={
                  latestGlp1
                    ? `${medicationLabels[latestGlp1.medicationName]} ${latestGlp1.doseMg} mg`
                    : "尚未紀錄"
                }
                helper={
                  latestGlp1
                    ? `${formatDate(latestGlp1.injectionDate)}，下次 ${formatDate(latestGlp1.nextInjectionDate)}`
                    : "待病人回報"
                }
              />
              <SmallStat
                label="副作用"
                value={
                  detail.glp1.highSideEffectAlert
                    ? "建議回診討論"
                    : "未達高警示"
                }
                helper={
                  latestSideEffect
                    ? `噁心 ${latestSideEffect.nauseaScore}/10，腹痛 ${latestSideEffect.abdominalPainScore}/10`
                    : "尚未回報"
                }
              />
            </div>
            <div className="space-y-2">
              {detail.glp1.sideEffectTrend.slice(-6).map((point) => (
                <div
                  key={`${point.date}-${point.nauseaScore}-${point.abdominalPainScore}`}
                  className="grid grid-cols-[5rem_1fr] items-center gap-3 text-sm"
                >
                  <span className="text-slate-500">{point.date.slice(5)}</span>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-amber-600"
                      style={{
                        width: `${Math.max(point.nauseaScore, point.abdominalPainScore) * 10}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="medical-soft-alert">{glp1SevereNotice}</p>
          </div>
        </SectionCard>

        <ClinicVisitReportGenerator
          patientId={detail.patient.id}
          initialReport={detail.latestVisitReport}
        />
      </div>
    </ClinicShell>
  );
}

function buildCleanRiskAlerts(
  detail: Awaited<ReturnType<typeof getClinicPatientDetail>>,
) {
  if (!detail) {
    return [];
  }

  const alerts: string[] = [];

  if (detail.latestAssessment?.needsMedicalReview) {
    alerts.push("健康評估顯示需先由醫師或專業人員評估");
  }

  if (detail.glp1.highSideEffectAlert) {
    alerts.push("GLP-1 副作用偏高，建議回診討論");
  }

  if (detail.glp1.nextInjectionDueSoon) {
    alerts.push("下一次 GLP-1 施打日接近或已到期");
  }

  if (detail.engagement.lowEngagementAlert) {
    alerts.push("7 天未登入或黏著度偏低");
  }

  if (detail.engagement.foodMissingAlert) {
    alerts.push("飲食已 3 天未記錄");
  }

  return alerts;
}

function WindowMetric({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="premium-card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal-700" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-600">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function SmallStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{helper}</p>
    </div>
  );
}

function TrendBlock({
  title,
  unit,
  points,
}: {
  title: string;
  unit: string;
  points: TrendPoint[];
}) {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => typeof value === "number");
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const latest = values[values.length - 1] ?? null;

  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-teal-700" aria-hidden="true" />
        <p className="text-sm font-semibold text-slate-950">{title}</p>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        最新：{latest === null ? "未紀錄" : `${latest}${unit}`}
      </p>
      <div className="mt-4 flex h-20 items-end gap-1">
        {points.slice(-8).map((point) => {
          const ratio =
            point.value === null || max === min
              ? 0.15
              : (point.value - min) / (max - min);

          return (
            <div
              key={`${title}-${point.date}-${point.value}`}
              className="flex flex-1 items-end"
              title={`${point.date}: ${point.value ?? "未紀錄"}`}
            >
              <div
                className="w-full rounded-t-full bg-teal-600/75"
                style={{ height: `${Math.max(16, ratio * 80)}px` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EngagementAlert({
  icon: Icon,
  active,
  label,
}: {
  icon: LucideIcon;
  active: boolean;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${
        active
          ? "bg-amber-50 text-amber-900"
          : "bg-teal-50 text-teal-800"
      }`}
    >
      {active ? (
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
      )}
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span>{active ? label : label.replace("警示：", "正常：")}</span>
    </div>
  );
}

function formatNullable(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) {
    return "未紀錄";
  }

  return `${value}${unit}`;
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
