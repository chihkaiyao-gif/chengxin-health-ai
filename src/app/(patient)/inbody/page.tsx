import { Activity, ScanLine, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { InBodyPhotoAnalyzer } from "@/components/inbody-photo-analyzer";
import {
  PremiumButton,
  SectionHeader,
  StatCard,
  TrendCard,
} from "@/components/premium-ui";
import {
  getInBodyHistoryForCurrentUser,
  getLatestInBodySummaryForCurrentUser,
} from "@/lib/inbody-data";

export const dynamic = "force-dynamic";

export default async function InBodyPage() {
  const [summary, history] = await Promise.all([
    getLatestInBodySummaryForCurrentUser(),
    getInBodyHistoryForCurrentUser(12),
  ]);
  const latest = summary.latest;

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <SectionHeader
            eyebrow="身體組成"
            title="把 InBody 變成看得懂的趨勢"
            description="上傳 InBody 報告後，AI 會協助讀取主要數據並做趨勢追蹤。AI 讀取結果僅供記錄與趨勢追蹤，請以原始 InBody 報告與專業人員解讀為準。"
            action={
              <PremiumButton href="#inbody-upload" icon={ScanLine} size="lg">
                上傳報告
              </PremiumButton>
            }
          />
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Activity}
            label="體重"
            value={formatMetric(latest?.weightKg ?? null)}
            unit={latest?.weightKg ? "kg" : undefined}
            helper={formatDelta(summary.comparison.weightKg.delta, "kg")}
          />
          <StatCard
            icon={TrendingUp}
            label="骨骼肌量"
            value={formatMetric(latest?.skeletalMuscleKg ?? null)}
            unit={latest?.skeletalMuscleKg ? "kg" : undefined}
            helper={formatDelta(summary.comparison.skeletalMuscleKg.delta, "kg")}
            tone="emerald"
          />
          <StatCard
            icon={TrendingDown}
            label="體脂率"
            value={formatMetric(latest?.bodyFatPercentage ?? null)}
            unit={latest?.bodyFatPercentage ? "%" : undefined}
            helper={formatDelta(summary.comparison.bodyFatPercentage.delta, "%")}
            tone="amber"
          />
          <StatCard
            icon={ScanLine}
            label="內臟脂肪面積"
            value={formatMetric(latest?.visceralFatAreaCm2 ?? null)}
            unit={latest?.visceralFatAreaCm2 ? "cm2" : undefined}
            helper={formatDelta(summary.comparison.visceralFatAreaCm2.delta, "cm2")}
            tone="blue"
          />
        </div>

        <TrendCard
          title="AI 解讀摘要"
          value={latest?.inbodyScore ? `${latest.inbodyScore} 分` : "等待資料"}
          delta={latest ? "最新報告" : "尚未上傳"}
          helper={
            latest?.aiSummary ||
            "上傳報告後，這裡會顯示溫和、可和專業人員討論的身體組成摘要。"
          }
        />

        <div id="inbody-upload">
          <InBodyPhotoAnalyzer initialSummary={summary} initialHistory={history} />
        </div>
      </div>
    </AppShell>
  );
}

function formatMetric(value: number | null) {
  return value === null ? "尚未紀錄" : String(value);
}

function formatDelta(delta: number | null, unit: string) {
  if (delta === null) {
    return "等待下一次比較";
  }

  if (delta === 0) {
    return "與前次持平";
  }

  return `較前次 ${delta > 0 ? "+" : ""}${delta}${unit}`;
}
