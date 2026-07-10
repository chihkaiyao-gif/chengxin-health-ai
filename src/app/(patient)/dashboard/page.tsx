import Link from "next/link";
import {
  Award,
  CalendarCheck,
  CalendarClock,
  Camera,
  CheckCircle2,
  Dumbbell,
  Flame,
  HeartPulse,
  Scale,
  ScanLine,
  Syringe,
  Target,
  Trophy,
  Utensils,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AiCoachCard } from "@/components/ai-coach-card";
import { AppShell } from "@/components/app-shell";
import { DailyTaskList } from "@/components/daily-task-list";
import { MedicalNotice } from "@/components/medical-notice";
import {
  HealthScoreCard,
  PremiumButton,
  SectionHeader,
  StatCard,
  TaskCard,
  TrendCard,
  WorkoutCard,
} from "@/components/premium-ui";
import { SectionCard } from "@/components/section-card";
import { getTodayCoachInsightForCurrentUser } from "@/lib/ai-coach";
import { getLatestAssessmentResultForCurrentUser } from "@/lib/assessment-data";
import { getLatestGlp1SummaryForCurrentUser } from "@/lib/glp1-data";
import { getLatestInBodySummaryForCurrentUser } from "@/lib/inbody-data";
import { getTodayNutritionSummaryForCurrentUser } from "@/lib/nutrition-data";
import {
  getBadgesForCurrentUser,
  getStreaksForCurrentUser,
  getTodayTasksForCurrentUser,
} from "@/lib/patient-engagement";
import { getActivePilotForCurrentUser } from "@/lib/pilot";
import type {
  Glp1MedicationName,
  Streak,
  StreakType,
  UserBadge,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const medicationLabels: Record<Glp1MedicationName, string> = {
  MOUNJARO: "猛健樂 Mounjaro",
  OZEMPIC: "Ozempic",
  WEGOVY: "Wegovy",
  SAXENDA: "Saxenda／瘦瘦筆",
  OTHER: "其他 GLP-1",
};

const streakLabels: Record<StreakType, { title: string; icon: LucideIcon }> = {
  login: { title: "連續登入", icon: Flame },
  food: { title: "連續飲食紀錄", icon: Utensils },
  workout: { title: "連續運動", icon: Dumbbell },
  medication_on_time: { title: "用藥準時", icon: Syringe },
  daily_record: { title: "連續健康紀錄", icon: CheckCircle2 },
};

const badgeIcons: Record<string, LucideIcon> = {
  "clipboard-check": CheckCircle2,
  flame: Flame,
  egg: Utensils,
  dumbbell: Dumbbell,
  "scan-line": ScanLine,
  "calendar-check": CalendarCheck,
  syringe: Syringe,
};

export default async function DashboardPage() {
  const [
    assessment,
    nutritionSummary,
    inbodySummary,
    glp1Summary,
    taskSummary,
    streaks,
    badges,
    coachInsight,
    activePilot,
  ] = await Promise.all([
    getLatestAssessmentResultForCurrentUser(),
    getTodayNutritionSummaryForCurrentUser(),
    getLatestInBodySummaryForCurrentUser(),
    getLatestGlp1SummaryForCurrentUser(),
    getTodayTasksForCurrentUser(),
    getStreaksForCurrentUser(),
    getBadgesForCurrentUser(),
    getTodayCoachInsightForCurrentUser(),
    getActivePilotForCurrentUser(),
  ]);

  const healthScore = Math.min(
    100,
    Math.round(
      taskSummary.completionRate * 0.72 +
        Math.min(100, nutritionSummary.proteinTargetRate) * 0.18 +
        Math.min(10, getStreak(streaks, "daily_record")?.currentCount || 0) * 1,
    ),
  );
  const latestGlp1Log = glp1Summary.latestMedicationLog;
  const proteinGap = Math.max(
    0,
    Math.round((nutritionSummary.proteinTargetG - nutritionSummary.proteinG) * 10) / 10,
  );
  const needsCareAttention =
    glp1Summary.highSideEffectAlert ||
    Boolean(assessment?.needsMedicalReview) ||
    taskSummary.importantPendingCount > 0;
  const onboardingItems = [
    {
      title: "完成健康評估",
      description: assessment
        ? `已分流為 ${assessment.personaLabel}`
        : "先完成問卷，系統才會知道你的照護路徑。",
      done: Boolean(assessment),
      href: "/assessment",
      icon: CheckCircle2,
    },
    {
      title: "上傳第一餐",
      description:
        nutritionSummary.logCount > 0
          ? `今天已有 ${nutritionSummary.logCount} 筆飲食紀錄`
          : "拍一餐讓 AI 協助估算營養，之後可手動修正。",
      done: nutritionSummary.logCount > 0,
      href: "/nutrition",
      icon: Camera,
    },
    {
      title: "上傳第一次 InBody",
      description: inbodySummary.latest
        ? `最近量測 ${formatDate(inbodySummary.latest.measuredAt)}`
        : "上傳報告後可追蹤體重、骨骼肌與體脂率。",
      done: Boolean(inbodySummary.latest),
      href: "/inbody",
      icon: ScanLine,
    },
    {
      title: "建立第一筆用藥紀錄",
      description: latestGlp1Log
        ? `${medicationLabels[latestGlp1Log.medicationName]} 已建立`
        : "若有使用 GLP-1，請記錄施打日期與副作用。請由醫師評估。",
      done: Boolean(latestGlp1Log),
      href: "/medications",
      icon: Syringe,
    },
    {
      title: "完成第一次 AI 健康教練建議",
      description: coachInsight.insight
        ? "今日 AI 健康教練建議已準備好。"
        : "產生保守的今日重點，協助你先做最重要的事。",
      done: Boolean(coachInsight.insight),
      href: "/dashboard",
      icon: HeartPulse,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="premium-hero p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeader
              eyebrow="今日首頁"
              title="今天先照顧好一件事"
              description="把飲食、體重、運動、GLP-1 與回診提醒收在同一頁。AI 僅做紀錄、提醒、趨勢分析與回診溝通輔助，不提供診斷或自動調藥。"
            />
            <div className="flex flex-wrap gap-2">
              <PremiumButton href="/nutrition" icon={Camera} size="lg">
                拍餐點
              </PremiumButton>
              <PremiumButton
                href="/training"
                icon={Dumbbell}
                variant="secondary"
                size="lg"
              >
                開始訓練
              </PremiumButton>
            </div>
          </div>
        </section>

        {activePilot ? (
          <section className="premium-card p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-100">
                  <Target className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-slate-950">
                    你正在參與 14 天健康管理試用計畫
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {activePilot.name}，期間 {activePilot.startDate} 至{" "}
                    {activePilot.endDate}。每日任務、飲食、用藥、AI 健康教練與回饋會協助診所評估試用成效。
                  </p>
                </div>
              </div>
              <Link href="/demo-tour" className="btn-secondary shrink-0">
                查看試用導覽
              </Link>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
          <HealthScoreCard
            score={healthScore}
            completed={taskSummary.completedCount}
            total={taskSummary.totalCount}
            subtitle={`今日任務完成率 ${taskSummary.completionRate}%，連續健康紀錄 ${
              getStreak(streaks, "daily_record")?.currentCount || 0
            } 天。`}
          />
          <DailyTaskList summary={taskSummary} />
        </div>

        <OnboardingChecklist items={onboardingItems} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Utensils}
            label="今日熱量"
            value={nutritionSummary.caloriesKcal}
            unit="kcal"
            helper={`蛋白質 ${nutritionSummary.proteinG}g，達標率 ${nutritionSummary.proteinTargetRate}%`}
          />
          <StatCard
            icon={HeartPulse}
            label="蛋白質差距"
            value={proteinGap}
            unit="g"
            helper={`今日目標 ${nutritionSummary.proteinTargetG}g，可依營養師建議調整。`}
            tone="emerald"
          />
          <StatCard
            icon={Scale}
            label="最新體重"
            value={
              inbodySummary.latest?.weightKg !== null &&
              inbodySummary.latest?.weightKg !== undefined
                ? inbodySummary.latest.weightKg
                : "待更新"
            }
            unit={inbodySummary.latest?.weightKg ? "kg" : undefined}
            helper={
              inbodySummary.latest
                ? `量測日 ${formatDate(inbodySummary.latest.measuredAt)}`
                : "上傳 InBody 或更新體重後會顯示。"
            }
            tone="blue"
          />
          <StatCard
            icon={Syringe}
            label="GLP-1 提醒"
            value={countdownText(glp1Summary.daysUntilNextInjection)}
            helper={
              latestGlp1Log
                ? `${medicationLabels[latestGlp1Log.medicationName]}，請由醫師評估。`
                : "尚未建立用藥紀錄。"
            }
            tone={glp1Summary.highSideEffectAlert ? "rose" : "amber"}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <WorkoutCard
            title="今日課表卡"
            subtitle={
              assessment?.todayRecommendations.exercise ||
              "完成初始健康評估後，系統會依分流安排更合適的低風險訓練。"
            }
            progress={taskSummary.completionRate}
            href="/training"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniPill label="建議強度" value="低到中等" />
              <MiniPill label="記錄重點" value="重量 / 次數 / RPE" />
              <MiniPill label="安全原則" value="不適先停" />
            </div>
          </WorkoutCard>

          <AiCoachCard initialInsight={coachInsight.insight} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <StreaksCard streaks={streaks} />
          <BadgesCard badges={badges.earned} totalCount={badges.totalCount} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <TrendCard
            title="最近 InBody 變化"
            value={
              inbodySummary.latest
                ? formatMetric(inbodySummary.latest.bodyFatPercentage, "%")
                : "尚未紀錄"
            }
            delta={formatDelta(inbodySummary.comparison.bodyFatPercentage.delta, "%")}
            helper="AI 讀取結果僅供記錄與趨勢追蹤，請以原始 InBody 報告與專業人員解讀為準。"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniPill
                label="骨骼肌"
                value={formatMetric(inbodySummary.latest?.skeletalMuscleKg ?? null, "kg")}
              />
              <MiniPill
                label="體脂肪量"
                value={formatMetric(inbodySummary.latest?.bodyFatMassKg ?? null, "kg")}
              />
              <MiniPill
                label="內臟脂肪"
                value={formatMetric(
                  inbodySummary.latest?.visceralFatAreaCm2 ?? null,
                  "cm²",
                )}
              />
            </div>
          </TrendCard>

          <SectionCard
            title="回診與照護提醒"
            eyebrow="照護提醒"
            action={
              <Link href="/appointments" className="btn-secondary">
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                預約回診
              </Link>
            }
          >
            <div className="space-y-3">
              <ReminderLine
                active={needsCareAttention}
                title={
                  needsCareAttention
                    ? "今天有項目建議由診所或醫師協助確認"
                    : "目前沒有高優先提醒"
                }
                description={
                  needsCareAttention
                    ? "若副作用偏高、評估屬高風險或重要任務未完成，請由醫師或診所人員評估。"
                    : "維持每日紀錄，回診時可更快整理趨勢。"
                }
              />
              <ReminderLine
                active={glp1Summary.nextInjectionDueSoon}
                title="GLP-1 即將施打"
                description="系統僅做提醒與紀錄，不自動調整劑量，請由醫師評估。"
              />
              <ReminderLine
                active={taskSummary.importantPendingCount > 0}
                title="尚有重要任務未完成"
                description={`還有 ${taskSummary.importantPendingCount} 項重要任務，可先補上用藥、副作用、蛋白質或運動紀錄。`}
              />
            </div>
            <MedicalNotice>
              所有醫療與用藥相關內容請由醫師評估；若出現嚴重不適，請立即就醫或聯絡醫療人員。
            </MedicalNotice>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}

function OnboardingChecklist({
  items,
}: {
  items: Array<{
    title: string;
    description: string;
    done: boolean;
    href: string;
    icon: LucideIcon;
  }>;
}) {
  const completed = items.filter((item) => item.done).length;
  const completionRate = Math.round((completed / items.length) * 100);

  return (
    <SectionCard
      title="新手任務"
      eyebrow="新手任務"
      action={
        <Link href="/demo-tour" className="btn-secondary">
          看示範導覽
        </Link>
      }
    >
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
          <span>
            已完成 {completed}/{items.length}
          </span>
          <span>{completionRate}%</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-700 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <TaskCard
            key={item.title}
            title={item.title}
            description={item.description}
            done={item.done}
            href={item.href}
            icon={item.icon}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function StreaksCard({ streaks }: { streaks: Streak[] }) {
  const visibleTypes: StreakType[] = [
    "login",
    "food",
    "workout",
    "medication_on_time",
  ];

  return (
    <SectionCard title="連續紀錄" eyebrow="紀錄天數">
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleTypes.map((type) => {
          const streak = getStreak(streaks, type);
          const Icon = streakLabels[type].icon;

          return (
            <div key={type} className="premium-card p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-50 text-teal-800 ring-1 ring-teal-100">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    {streakLabels[type].title}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-slate-950">
                    {streak?.currentCount || 0}
                    <span className="ml-1 text-sm text-slate-500">天</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    最長 {streak?.longestCount || 0} 天
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function BadgesCard({
  badges,
  totalCount,
}: {
  badges: UserBadge[];
  totalCount: number;
}) {
  return (
    <SectionCard title="徽章" eyebrow="成就進度">
      {badges.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {badges.slice(0, 4).map((userBadge) => {
            const Icon = badgeIcons[userBadge.badge.icon] || Award;

            return (
              <div key={userBadge.id} className="premium-card p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-900 ring-1 ring-amber-100">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-950">
                      {userBadge.badge.name}
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">
                      {userBadge.badge.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="premium-card p-5 text-sm leading-6 text-slate-600">
          完成初始健康評估與每日任務後，徽章會在這裡亮起。
        </div>
      )}
      <div className="mt-4 flex items-center justify-between rounded-3xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
        <span>已獲得 {badges.length}/{totalCount || 7}</span>
        <span className="inline-flex items-center gap-1 text-teal-700">
          <Trophy className="h-4 w-4" aria-hidden="true" />
          徽章功能已啟用
        </span>
      </div>
    </SectionCard>
  );
}

function ReminderLine({
  active,
  title,
  description,
}: {
  active: boolean;
  title: string;
  description: string;
}) {
  return (
    <div
      className={`rounded-3xl px-4 py-3 ring-1 ${
        active
          ? "bg-amber-50 text-amber-950 ring-amber-100"
          : "bg-slate-50 text-slate-700 ring-slate-100"
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-6">{description}</p>
    </div>
  );
}

function MiniPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white px-4 py-3 ring-1 ring-[var(--chx-line)]">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function getStreak(streaks: Streak[], streakType: StreakType) {
  return streaks.find((streak) => streak.streakType === streakType) || null;
}

function formatMetric(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) {
    return "待更新";
  }

  return `${value}${unit}`;
}

function formatDelta(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${unit}`;
}

function countdownText(days: number | null) {
  if (days === null) {
    return "未設定";
  }

  if (days < 0) {
    return `已過 ${Math.abs(days)} 天`;
  }

  if (days === 0) {
    return "今天";
  }

  return `${days} 天`;
}

function formatDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
