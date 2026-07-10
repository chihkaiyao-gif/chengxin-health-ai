import { AlertTriangle, CalendarClock, HeartPulse, Syringe } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Glp1MedicationTracker } from "@/components/glp1-medication-tracker";
import { MedicalNotice } from "@/components/medical-notice";
import {
  PremiumButton,
  ReminderCard,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { medicationNameLabels } from "@/lib/glp1";
import {
  getGlp1HistoryForCurrentUser,
  getLatestGlp1SummaryForCurrentUser,
} from "@/lib/glp1-data";

export const dynamic = "force-dynamic";

export default async function MedicationsPage() {
  const [summary, history] = await Promise.all([
    getLatestGlp1SummaryForCurrentUser(),
    getGlp1HistoryForCurrentUser(),
  ]);
  const latestLog = summary.latestMedicationLog;
  const latestSideEffect = summary.latestSideEffectLog;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <SectionHeader
            eyebrow="GLP-1 tracking"
            title="用藥紀錄清楚，回診討論更安心"
            description="系統僅做 GLP-1 類藥物紀錄、提醒、趨勢追蹤與回診溝通輔助，不診斷、不自動調藥。所有藥物相關建議均請由醫師評估。"
            action={
              <PremiumButton href="#glp1-form" icon={Syringe} size="lg">
                新增紀錄
              </PremiumButton>
            }
          />
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={CalendarClock}
            label="下次施打倒數"
            value={countdownText(summary.daysUntilNextInjection)}
            helper={latestLog ? `預計 ${formatDate(latestLog.nextInjectionDate)}` : "建立紀錄後自動推估。"}
            tone={summary.nextInjectionDueSoon ? "amber" : "teal"}
          />
          <StatCard
            icon={Syringe}
            label="最近劑量"
            value={
              latestLog
                ? `${medicationNameLabels[latestLog.medicationName]} ${latestLog.doseMg}`
                : "尚未紀錄"
            }
            unit={latestLog ? "mg" : undefined}
            helper="劑量相關決策請由醫師評估。"
            tone="emerald"
          />
          <StatCard
            icon={HeartPulse}
            label="副作用摘要"
            value={summary.highSideEffectAlert ? "建議回診" : "穩定追蹤"}
            helper={
              latestSideEffect
                ? `噁心 ${latestSideEffect.nauseaScore}/10，腹痛 ${latestSideEffect.abdominalPainScore}/10`
                : "尚未回報副作用。"
            }
            tone={summary.highSideEffectAlert ? "rose" : "blue"}
          />
        </div>

        {summary.highSideEffectAlert ? (
          <ReminderCard
            icon={AlertTriangle}
            tone="amber"
            title="副作用偏高，建議回診與醫師討論"
            message="若出現嚴重不適，請立即就醫或聯絡醫療人員。請由醫師評估。"
            actionHref="/appointments"
            actionLabel="送出回診需求"
          />
        ) : null}

        <div id="glp1-form">
          <Glp1MedicationTracker
            initialSummary={summary}
            initialHistory={history}
          />
        </div>

        <MedicalNotice compact />
      </div>
    </AppShell>
  );
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
  });
}

function countdownText(days: number | null) {
  if (days === null) {
    return "尚未提醒";
  }

  if (days < 0) {
    return `逾期 ${Math.abs(days)} 天`;
  }

  if (days === 0) {
    return "今天";
  }

  return `剩 ${days} 天`;
}
