import Link from "next/link";
import {
  AlertTriangle,
  Award,
  Clock3,
  FileText,
  Flame,
  Search,
  Syringe,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ClinicShell } from "@/components/clinic-shell";
import {
  PremiumButton,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import { getClinicGlp1Alerts } from "@/lib/glp1-data";
import type { ClinicGlp1AlertPatient, Glp1MedicationName } from "@/lib/types";

export const dynamic = "force-dynamic";

const riskLabel = {
  LOW: "穩定",
  WATCH: "觀察",
  NEEDS_REVIEW: "需回診評估",
};

const medicationLabels: Record<Glp1MedicationName, string> = {
  MOUNJARO: "猛健樂",
  OZEMPIC: "Ozempic",
  WEGOVY: "Wegovy",
  SAXENDA: "Saxenda／瘦瘦筆",
  OTHER: "其他 GLP-1",
};

export default async function ClinicPatientsPage() {
  const patients = await getClinicGlp1Alerts();
  const highSideEffectCount = patients.filter(
    (patient) => patient.highSideEffectAlert,
  ).length;
  const dueSoonCount = patients.filter(
    (patient) => patient.nextInjectionDueSoon,
  ).length;
  const lowEngagementCount = patients.filter(
    (patient) => patient.engagement?.lowEngagementAlert,
  ).length;

  return (
    <ClinicShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="病人管理"
              title="病人追蹤"
              description="優先查看副作用、下一次施打、今日任務完成率與低黏著警示。手機版以病人卡片呈現，桌面版保留表格快速掃描。"
            />
            <PremiumButton
              href="/clinic/patients/demo-1"
              icon={FileText}
              variant="secondary"
            >
              查看示範病人
            </PremiumButton>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={AlertTriangle}
            label="高副作用警示"
            value={highSideEffectCount}
            helper="建議安排診所聯絡或回診討論。"
            tone="rose"
          />
          <StatCard
            icon={Syringe}
            label="即將施打"
            value={dueSoonCount}
            helper="距離下一次施打日 1 天內。"
            tone="amber"
          />
          <StatCard
            icon={Users}
            label="低黏著警示"
            value={lowEngagementCount}
            helper="連續登入或今日任務完成率偏低。"
            tone="blue"
          />
        </div>

        <SectionCard title="病人清單" eyebrow="權限控管保護">
          <div className="mb-5 flex items-center gap-3 rounded-3xl border border-[var(--chx-line)] bg-white px-4 py-3">
            <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <input
              aria-label="搜尋病人"
              placeholder="搜尋姓名、用藥狀態、徽章或警示"
              className="min-h-0 border-0 bg-transparent p-0 text-sm focus:ring-0"
            />
          </div>

          {patients.length > 0 ? (
            <>
              <div className="grid gap-4 lg:hidden">
                {patients.map((patient) => (
                  <PatientCard key={patient.id} patient={patient} />
                ))}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1120px] text-left text-sm">
                  <thead>
                    <tr className="text-slate-500">
                      <th className="rounded-l-2xl bg-slate-50 px-4 py-3 font-semibold">
                        病人
                      </th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">年齡</th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">
                        最近 GLP-1
                      </th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">
                        下次施打
                      </th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">
                        副作用
                      </th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">
                        連續登入
                      </th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">
                        今日任務
                      </th>
                      <th className="bg-slate-50 px-4 py-3 font-semibold">
                        最近徽章
                      </th>
                      <th className="rounded-r-2xl bg-slate-50 px-4 py-3 font-semibold">
                        警示
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <PatientRow key={patient.id} patient={patient} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="premium-card p-6 text-sm leading-6 text-slate-600">
              尚無病人資料。正式環境會依診所關聯與 RLS 權限顯示可查看病人。
            </div>
          )}
        </SectionCard>
      </div>
    </ClinicShell>
  );
}

function PatientCard({ patient }: { patient: ClinicGlp1AlertPatient }) {
  const log = patient.latestGlp1Log;
  const sideEffect = patient.latestSideEffectLog;
  const engagement = patient.engagement;

  return (
    <Link
      href={`/clinic/patients/${patient.id}`}
      className="premium-card completed-pop block p-4 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-950">
            {patient.fullName}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {patient.age ?? "未填"} 歲 / {riskLabel[patient.riskFlag]}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {engagement?.todayTaskCompletionRate ?? 0}% 任務
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <CardLine
          label="最近 GLP-1"
          value={
            log
              ? `${medicationLabels[log.medicationName]} ${log.doseMg} mg`
              : "未使用或尚未回報"
          }
        />
        <CardLine
          label="下次施打"
          value={patient.nextInjectionDate ? formatDate(patient.nextInjectionDate) : "無提醒"}
        />
        <CardLine
          label="副作用"
          value={
            sideEffect
              ? `噁心 ${sideEffect.nauseaScore}/10，腹痛 ${sideEffect.abdominalPainScore}/10`
              : "尚未回報"
          }
        />
        <CardLine
          label="連續登入"
          value={`${engagement?.consecutiveLoginDays ?? 0} 天`}
        />
        <CardLine
          label="最近徽章"
          value={engagement?.recentBadgeName || "尚無"}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <PatientBadges patient={patient} />
      </div>
    </Link>
  );
}

function PatientRow({ patient }: { patient: ClinicGlp1AlertPatient }) {
  const sideEffect = patient.latestSideEffectLog;
  const log = patient.latestGlp1Log;
  const engagement = patient.engagement;

  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-4">
        <Link
          href={`/clinic/patients/${patient.id}`}
          className="font-semibold text-slate-950 hover:text-teal-700"
        >
          {patient.fullName}
        </Link>
      </td>
      <td className="px-4 py-4 text-slate-600">{patient.age ?? "未填"}</td>
      <td className="px-4 py-4 text-slate-600">
        {log
          ? `${medicationLabels[log.medicationName]} ${log.doseMg} mg`
          : "未使用或尚未回報"}
      </td>
      <td className="px-4 py-4 text-slate-600">
        {patient.nextInjectionDate ? formatDate(patient.nextInjectionDate) : "無提醒"}
      </td>
      <td className="px-4 py-4 text-slate-600">
        {sideEffect
          ? `噁心 ${sideEffect.nauseaScore}/10，腹痛 ${sideEffect.abdominalPainScore}/10`
          : "尚未回報"}
      </td>
      <td className="px-4 py-4 text-slate-600">
        {engagement?.consecutiveLoginDays ?? 0} 天
      </td>
      <td className="px-4 py-4">
        <CompletionPill value={engagement?.todayTaskCompletionRate ?? 0} />
      </td>
      <td className="px-4 py-4 text-slate-600">
        {engagement?.recentBadgeName ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-100">
            <Award className="h-3.5 w-3.5" aria-hidden="true" />
            {engagement.recentBadgeName}
          </span>
        ) : (
          "尚無"
        )}
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <PatientBadges patient={patient} />
        </div>
      </td>
    </tr>
  );
}

function PatientBadges({ patient }: { patient: ClinicGlp1AlertPatient }) {
  const hasBadge =
    patient.highSideEffectAlert ||
    patient.nextInjectionDueSoon ||
    patient.missingRecentReport ||
    patient.engagement?.lowEngagementAlert;

  if (!hasBadge) {
    return <AlertBadge tone="stable" label="無新警示" />;
  }

  return (
    <>
      {patient.highSideEffectAlert ? (
        <AlertBadge tone="danger" label="高副作用" />
      ) : null}
      {patient.nextInjectionDueSoon ? (
        <AlertBadge tone="warning" label="即將施打" />
      ) : null}
      {patient.missingRecentReport ? (
        <AlertBadge tone="neutral" label="未回報" />
      ) : null}
      {patient.engagement?.lowEngagementAlert ? (
        <AlertBadge tone="warning" label="低黏著" icon={Flame} />
      ) : null}
    </>
  );
}

function CompletionPill({ value }: { value: number }) {
  const tone =
    value >= 70
      ? "bg-teal-50 text-teal-800 ring-teal-100"
      : value >= 40
        ? "bg-amber-50 text-amber-900 ring-amber-100"
        : "bg-rose-50 text-rose-800 ring-rose-100";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${tone}`}>
      {value}%
    </span>
  );
}

function CardLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function AlertBadge({
  tone,
  label,
  icon: CustomIcon,
}: {
  tone: "danger" | "warning" | "neutral" | "stable";
  label: string;
  icon?: LucideIcon;
}) {
  const classes = {
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    stable: "bg-teal-50 text-teal-700 ring-teal-200",
  };
  const Icon =
    CustomIcon || (tone === "warning" ? Clock3 : tone === "danger" ? AlertTriangle : null);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${classes[tone]}`}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
