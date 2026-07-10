import { Camera, Flame, HeartPulse, Utensils } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NutritionPhotoAnalyzer } from "@/components/nutrition-photo-analyzer";
import {
  FoodCard,
  PremiumButton,
  ProgressRing,
  SectionHeader,
  StatCard,
} from "@/components/premium-ui";
import { getLatestAssessmentResultForCurrentUser } from "@/lib/assessment-data";
import { getTodayNutritionSummaryForCurrentUser } from "@/lib/nutrition-data";

export const dynamic = "force-dynamic";

export default async function NutritionPage() {
  const [assessment, summary] = await Promise.all([
    getLatestAssessmentResultForCurrentUser(),
    getTodayNutritionSummaryForCurrentUser(),
  ]);
  const showMedicalNutritionNotice =
    assessment?.needsMedicalReview ||
    assessment?.persona === "chronic_disease" ||
    assessment?.persona === "high_risk_medical_review";
  const proteinGap = Math.max(0, summary.proteinTargetG - summary.proteinG);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-end">
            <SectionHeader
              eyebrow="飲食紀錄"
              title="拍一張餐點，先知道大方向"
              description="AI 營養估算僅供參考，實際熱量會因份量與料理方式不同。若有糖尿病、腎臟病或高風險狀態，請依醫師或營養師建議調整飲食。"
              action={
                <PremiumButton href="#meal-photo" icon={Camera} size="lg">
                  拍照估算
                </PremiumButton>
              }
            />
            <div className="premium-card flex items-center justify-between gap-4 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-600">
                  蛋白質達標率
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {summary.proteinTargetRate}%
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  還差 {proteinGap}g
                </p>
              </div>
              <ProgressRing
                value={summary.proteinTargetRate}
                size={100}
                label={`${summary.proteinTargetRate}%`}
                sublabel="蛋白質"
              />
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={Flame}
            label="今日熱量"
            value={summary.caloriesKcal}
            unit="kcal"
            helper={`${summary.logCount} 筆餐點紀錄`}
          />
          <StatCard
            icon={HeartPulse}
            label="蛋白質"
            value={summary.proteinG}
            unit="g"
            helper={`今日目標 ${summary.proteinTargetG}g`}
            tone="emerald"
          />
          <StatCard
            icon={Utensils}
            label="碳水 / 脂肪"
            value={`${summary.carbsG}/${summary.fatG}`}
            unit="g"
            helper="用於趨勢追蹤，不做疾病治療建議。"
            tone="blue"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <FoodCard
            mealName="今日餐點照片"
            mealType="先拍照紀錄"
            calories={summary.caloriesKcal || "待估算"}
            protein={summary.proteinG}
            carbs={summary.carbsG}
            fat={summary.fatG}
          />
          <div id="meal-photo">
            <NutritionPhotoAnalyzer
              initialSummary={summary}
              showMedicalNutritionNotice={Boolean(showMedicalNutritionNotice)}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
