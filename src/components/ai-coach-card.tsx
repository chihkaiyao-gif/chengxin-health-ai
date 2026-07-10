"use client";

import { useState, useTransition } from "react";
import {
  AlertTriangle,
  Dumbbell,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Syringe,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AiCoachInsight } from "@/lib/types";
import { PremiumButton } from "@/components/premium-ui";

type AiCoachCardProps = {
  initialInsight: AiCoachInsight;
  compact?: boolean;
};

export function AiCoachCard({ initialInsight, compact = false }: AiCoachCardProps) {
  const [insight, setInsight] = useState(initialInsight);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function regenerate() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/ai/coach-insight/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force: true }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.data?.insight) {
        setError("目前無法重新產生建議，請稍後再試。");
        return;
      }

      setInsight(payload.data.insight);
    });
  }

  return (
    <section className="premium-card overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            AI 健康教練
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">
            今日一句話建議
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {insight.summary}
          </p>
        </div>
        {!compact ? (
          <PremiumButton
            type="button"
            variant="secondary"
            icon={RefreshCw}
            onClick={regenerate}
            disabled={isPending}
          >
            {isPending ? "產生中" : "重新產生"}
          </PremiumButton>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3">
        <p className="text-sm font-semibold text-slate-600">今日三個重點</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {insight.priorityTasks.slice(0, 3).map((task, index) => (
            <div
              key={`${task}-${index}`}
              className="rounded-3xl bg-teal-50 px-4 py-3 text-sm font-semibold leading-6 text-teal-900 ring-1 ring-teal-100"
            >
              {task}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <AdviceItem icon={Utensils} title="飲食建議" body={insight.nutritionAdvice} />
        <AdviceItem icon={Dumbbell} title="運動建議" body={insight.exerciseAdvice} />
        <AdviceItem icon={Syringe} title="用藥／副作用提醒" body={insight.medicationAdvice} />
        <AdviceItem icon={Stethoscope} title="回診提醒" body={insight.followUpAdvice} />
      </div>

      {insight.riskFlags.length > 0 ? (
        <div className="mt-5 rounded-3xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 ring-1 ring-amber-100">
          <p className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            風險提示
          </p>
          <p className="mt-1">
            {insight.riskFlags.map(formatRiskFlag).join("、")}。若出現嚴重不適，請立即就醫或聯絡醫療人員。
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function formatRiskFlag(flag: string) {
  const labels: Record<string, string> = {
    low_engagement: "低黏著提醒",
    food_missing_3d: "飲食紀錄已 3 天未更新",
    high_side_effect_alert: "副作用偏高提醒",
    next_injection_due_soon: "即將施打提醒",
    high_risk_medical_review: "需醫師或專業人員評估",
    inbody_stale_30d: "身體組成超過 30 天未更新",
    weight_plateau_14d: "體重趨勢停滯提醒",
    medication_missing: "用藥紀錄未回報",
  };

  return labels[flag] || flag.replaceAll("_", " ");
}

function AdviceItem({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-teal-700 ring-1 ring-[var(--chx-line)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="font-semibold text-slate-950">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}
