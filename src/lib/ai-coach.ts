import { getLatestAssessmentResultForCurrentUser } from "@/lib/assessment-data";
import {
  generateCoachInsight,
  type AiProviderName,
} from "@/lib/ai/provider";
import { getCurrentUser } from "@/lib/auth";
import { buildEngagementSummary, engagementMetricSelect, mapEngagementMetricRow } from "@/lib/engagement";
import { getLatestGlp1SummaryForCurrentUser } from "@/lib/glp1-data";
import { getLatestInBodySummaryForCurrentUser } from "@/lib/inbody-data";
import { getTodayFoodLogsForCurrentUser } from "@/lib/nutrition-data";
import {
  dateOnly,
  getTodayTasksForCurrentUser,
} from "@/lib/patient-engagement";
import { hasSupabaseConfig, isDemoMode } from "@/lib/supabase/server";
import type {
  AiCoachInsight,
  AiCoachInsightResponse,
  AssessmentPersona,
  EngagementSummary,
  FoodLog,
  Glp1LatestSummary,
  InBodyLatestSummary,
  TodayTasksSummary,
  TrainingLog,
} from "@/lib/types";
import type { CoachInsightGenerateRequestInput } from "@/lib/validation";
import { coachInsightOutputSchema } from "@/lib/validation";

export const aiCoachInsightSelect =
  "id,user_id,insight_date,persona,summary,priority_tasks,nutrition_advice,exercise_advice,medication_advice,follow_up_advice,risk_flags,ai_raw_response,created_at";

type AiCoachInsightRow = {
  id: string;
  user_id: string;
  insight_date: string;
  persona: AssessmentPersona;
  summary: string;
  priority_tasks: string[] | unknown;
  nutrition_advice: string;
  exercise_advice: string;
  medication_advice: string;
  follow_up_advice: string;
  risk_flags: string[] | unknown;
  ai_raw_response: Record<string, unknown> | null;
  created_at: string;
};

type TrainingLogRow = {
  id: string;
  patient_id: string;
  trained_on: string;
  started_at: string | null;
  ended_at: string | null;
  gym_name: string | null;
  activity_type: string;
  duration_minutes: number | string | null;
  intensity: TrainingLog["intensity"];
  notes: string | null;
  created_at: string;
  updated_at?: string;
};

type CoachSource = {
  assessment: Awaited<ReturnType<typeof getLatestAssessmentResultForCurrentUser>>;
  foodLogsToday: FoodLog[];
  todayTasks: TodayTasksSummary;
  inbody: InBodyLatestSummary;
  glp1: Glp1LatestSummary;
  engagement7d: EngagementSummary;
  recentWorkouts7d: TrainingLog[];
};

const personaFallbacks: Record<
  AssessmentPersona,
  {
    summary: string;
    nutritionAdvice: string;
    exerciseAdvice: string;
    medicationAdvice: string;
    followUpAdvice: string;
  }
> = {
  fitness_beginner: {
    summary: "今天先完成一餐飲食紀錄與低強度活動，穩穩建立節奏。",
    nutritionAdvice: "每餐先確認蛋白質來源，AI 營養估算僅供參考，若有疾病限制請依醫師或營養師建議調整。",
    exerciseAdvice: "以低強度有氧、機械式或基礎動作開始；若胸痛、暈眩或異常喘，請停止並聯絡醫療人員。",
    medicationAdvice: "若有任何用藥或副作用疑問，請由醫師評估。",
    followUpAdvice: "把今天的飲食、體重或運動先補上一項，回診時會更容易看出趨勢。",
  },
  gym_training: {
    summary: "今天重點是訓練品質、恢復與穩定蛋白質，不急著堆重量。",
    nutritionAdvice: "訓練日前後留意蛋白質與水分；若熱量估算不確定，可先修正 AI 估算數字。",
    exerciseAdvice: "維持 RPE 6-8，逐步增加重量或總量，若疲勞偏高就先保留強度。",
    medicationAdvice: "若使用 GLP-1 或其他藥物，劑量與訓練日安排請由醫師評估。",
    followUpAdvice: "回診可帶上訓練執行率、InBody 趨勢與恢復狀態，協助討論下一階段。",
  },
  home_training: {
    summary: "今天用一個居家任務加一段步行，讓紀錄不要中斷。",
    nutritionAdvice: "外食時先補足蛋白質，含糖飲料與宵夜可先從頻率紀錄開始。",
    exerciseAdvice: "以徒手、彈力帶、啞鈴或步行為主，動作品質優先於速度。",
    medicationAdvice: "用藥只做紀錄與提醒，任何調整請由醫師評估。",
    followUpAdvice: "若連續幾天未記錄，今天先完成一個最容易的任務即可。",
  },
  glp1_weight_loss: {
    summary: "今天先顧好蛋白質、水分與副作用回報，肌肉保留比速度更重要。",
    nutritionAdvice: "採少量多餐、優先蛋白質與清淡食物；若噁心明顯，請記錄誘發食物並依醫師或營養師建議調整。",
    exerciseAdvice: "以步行與低強度肌力保留肌肉，避免空腹高強度訓練。",
    medicationAdvice: "GLP-1 施打、劑量與副作用處理請由醫師評估；若嚴重嘔吐、脫水或腹痛，請立即就醫或聯絡醫療人員。",
    followUpAdvice: "回診時帶上體重、飲食蛋白質、施打日期與副作用紀錄，方便醫師判斷。",
  },
  chronic_disease: {
    summary: "今天以規律紀錄、飲食穩定與低風險活動為主。",
    nutritionAdvice: "維持穩定餐次與蛋白質來源；糖尿病、腎臟病或高風險族群請依醫師或營養師建議調整。",
    exerciseAdvice: "選擇低衝擊運動，留意血壓、血糖與身體反應，不適時先停止。",
    medicationAdvice: "降血糖、降血壓或 GLP-1 相關內容請由醫師評估，不自行調整。",
    followUpAdvice: "若多日未記錄飲食或身體數據，建議回診前先補上近況。",
  },
  senior_frailty: {
    summary: "今天先做安全、平衡、坐站與補水，避免跌倒風險。",
    nutritionAdvice: "每餐留意蛋白質與水分，若食慾差或吞嚥不適，請與專業人員討論。",
    exerciseAdvice: "以坐站、扶椅平衡、低衝擊肌力或短時間步行為主，環境要先確認安全。",
    medicationAdvice: "若有頭暈、低血糖感或跌倒風險，用藥相關請由醫師評估。",
    followUpAdvice: "近期曾跌倒、平衡變差或活動力下降，建議聯絡診所評估。",
  },
  high_risk_medical_review: {
    summary: "今天先不要開始運動計畫，請先由醫師或專業人員評估。",
    nutritionAdvice: "維持基本飲食與水分紀錄即可；若有疾病限制請依醫師或營養師建議調整。",
    exerciseAdvice: "暫不提供運動建議；請先由醫師或專業人員評估後再開始。",
    medicationAdvice: "所有用藥、劑量與副作用處理請由醫師評估；嚴重不適請立即就醫或聯絡醫療人員。",
    followUpAdvice: "建議先聯絡診所或醫療人員，確認是否適合開始運動或調整照護路徑。",
  },
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function mapTrainingLogRow(row: TrainingLogRow): TrainingLog {
  return {
    id: row.id,
    userId: row.patient_id,
    trainedOn: row.trained_on,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    gymName: row.gym_name,
    activityType: row.activity_type,
    durationMinutes: toNumber(row.duration_minutes),
    intensity: row.intensity,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAiCoachInsightRow(row: AiCoachInsightRow): AiCoachInsight {
  return {
    id: row.id,
    userId: row.user_id,
    insightDate: row.insight_date,
    persona: row.persona,
    summary: row.summary,
    priorityTasks: toStringArray(row.priority_tasks),
    nutritionAdvice: row.nutrition_advice,
    exerciseAdvice: row.exercise_advice,
    medicationAdvice: row.medication_advice,
    followUpAdvice: row.follow_up_advice,
    riskFlags: toStringArray(row.risk_flags),
    aiRawResponse: row.ai_raw_response || {},
    createdAt: row.created_at,
  };
}

function defaultPersona(source: CoachSource): AssessmentPersona {
  return source.assessment?.persona || "fitness_beginner";
}

function isAiProviderName(value: unknown): value is AiProviderName {
  return (
    value === "openai" ||
    value === "anthropic" ||
    value === "gemini" ||
    value === "deepseek"
  );
}

function aiProviderFromRaw(rawResponse: Record<string, unknown>) {
  return isAiProviderName(rawResponse.provider)
    ? rawResponse.provider
    : "fallback";
}

function sourceRiskFlags(source: CoachSource) {
  const flags = new Set<string>();

  source.assessment?.riskFlags.forEach((flag) => flags.add(flag));

  if (source.assessment?.needsMedicalReview) {
    flags.add("needs_medical_review");
  }

  if (source.glp1.highSideEffectAlert) {
    flags.add("high_side_effect_alert");
  }

  if (source.glp1.nextInjectionDueSoon) {
    flags.add("next_injection_due_soon");
  }

  if (source.engagement7d.lowEngagementAlert) {
    flags.add("low_engagement");
  }

  if (source.engagement7d.foodMissingAlert) {
    flags.add("food_missing_3d");
  }

  return Array.from(flags);
}

function ensureMedicationSafety(value: string) {
  return value.includes("請由醫師評估")
    ? value
    : `${value} 請由醫師評估。`;
}

function enforceCoachSafety(
  output: ReturnType<typeof coachInsightOutputSchema.parse>,
  persona: AssessmentPersona,
) {
  const riskFlags = new Set(output.riskFlags);

  if (persona === "high_risk_medical_review") {
    riskFlags.add("high_risk_medical_review");
  }

  return {
    ...output,
    summary:
      persona === "high_risk_medical_review"
        ? "今天先不要開始運動計畫，請先由醫師或專業人員評估。"
        : output.summary,
    exerciseAdvice:
      persona === "high_risk_medical_review"
        ? "暫不提供運動建議；請先由醫師或專業人員評估後再開始。"
        : output.exerciseAdvice,
    medicationAdvice: ensureMedicationSafety(output.medicationAdvice),
    followUpAdvice:
      riskFlags.size > 0 && !output.followUpAdvice.includes("醫療人員")
        ? `${output.followUpAdvice} 若出現嚴重不適，請立即就醫或聯絡醫療人員。`
        : output.followUpAdvice,
    riskFlags: Array.from(riskFlags).slice(0, 10),
  };
}

function buildFallbackInsight(
  source: CoachSource,
  userId = "demo-user",
  rawResponse: Record<string, unknown> = { provider: "fallback" },
): AiCoachInsight {
  const persona = defaultPersona(source);
  const base = personaFallbacks[persona];
  const pendingImportantTasks = source.todayTasks.tasks
    .filter((task) => task.status !== "completed" && task.priority === "important")
    .map((task) => task.title);
  const pendingTasks = source.todayTasks.tasks
    .filter((task) => task.status !== "completed")
    .map((task) => task.title);
  const priorityTasks = [
    ...pendingImportantTasks,
    ...pendingTasks,
    "補上今日健康紀錄",
  ]
    .filter((item, index, array) => array.indexOf(item) === index)
    .slice(0, 3);

  const safeOutput = enforceCoachSafety(
    {
      summary: base.summary,
      priorityTasks,
      nutritionAdvice: base.nutritionAdvice,
      exerciseAdvice: base.exerciseAdvice,
      medicationAdvice: base.medicationAdvice,
      followUpAdvice: base.followUpAdvice,
      riskFlags: sourceRiskFlags(source),
    },
    persona,
  );

  return {
    id: `fallback-coach-${userId}-${dateOnly()}`,
    userId,
    insightDate: dateOnly(),
    persona,
    summary: safeOutput.summary,
    priorityTasks: safeOutput.priorityTasks,
    nutritionAdvice: safeOutput.nutritionAdvice,
    exerciseAdvice: safeOutput.exerciseAdvice,
    medicationAdvice: safeOutput.medicationAdvice,
    followUpAdvice: safeOutput.followUpAdvice,
    riskFlags: safeOutput.riskFlags,
    aiRawResponse: rawResponse,
    createdAt: new Date().toISOString(),
  };
}

async function getRecentTrainingLogsForCurrentUser(): Promise<TrainingLog[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  const start = dateOnly(startDate);

  const { data } = await supabase
    .from("training_logs")
    .select("id,patient_id,trained_on,started_at,ended_at,gym_name,activity_type,duration_minutes,intensity,notes,created_at,updated_at")
    .eq("patient_id", user.id)
    .gte("trained_on", start)
    .order("trained_on", { ascending: false });

  return ((data || []) as TrainingLogRow[]).map(mapTrainingLogRow);
}

async function getEngagementSummary7d(): Promise<EngagementSummary> {
  if (!hasSupabaseConfig()) {
    return buildEngagementSummary([]);
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return buildEngagementSummary([]);
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);

  const { data } = await supabase
    .from("engagement_metrics")
    .select(engagementMetricSelect)
    .eq("user_id", user.id)
    .gte("metric_date", dateOnly(startDate))
    .order("metric_date", { ascending: false });

  return buildEngagementSummary((data || []).map(mapEngagementMetricRow));
}

async function buildCurrentCoachSource(): Promise<CoachSource> {
  const [
    assessment,
    foodLogsToday,
    todayTasks,
    inbody,
    glp1,
    engagement7d,
    recentWorkouts7d,
  ] = await Promise.all([
    getLatestAssessmentResultForCurrentUser(),
    getTodayFoodLogsForCurrentUser(),
    getTodayTasksForCurrentUser(),
    getLatestInBodySummaryForCurrentUser(),
    getLatestGlp1SummaryForCurrentUser(),
    getEngagementSummary7d(),
    getRecentTrainingLogsForCurrentUser(),
  ]);

  return {
    assessment,
    foodLogsToday,
    todayTasks,
    inbody,
    glp1,
    engagement7d,
    recentWorkouts7d,
  };
}

async function createAiInsight(
  source: CoachSource,
): Promise<{ insight: AiCoachInsight; provider: AiProviderName | "fallback" }> {
  const fallback = buildFallbackInsight(source);

  try {
    const persona = defaultPersona(source);
    const aiResult = await generateCoachInsight({
      persona,
      source,
    });

    if (!aiResult) {
      return { insight: fallback, provider: "fallback" };
    }

    const parsed = coachInsightOutputSchema.parse(aiResult.data);
    const safeOutput = enforceCoachSafety(parsed, persona);

    return {
      provider: aiResult.provider,
      insight: {
        ...fallback,
        persona,
        summary: safeOutput.summary,
        priorityTasks: safeOutput.priorityTasks,
        nutritionAdvice: safeOutput.nutritionAdvice,
        exerciseAdvice: safeOutput.exerciseAdvice,
        medicationAdvice: safeOutput.medicationAdvice,
        followUpAdvice: safeOutput.followUpAdvice,
        riskFlags: Array.from(new Set([...sourceRiskFlags(source), ...safeOutput.riskFlags])),
        aiRawResponse: {
          ...aiResult.raw,
          provider: aiResult.provider,
        },
      },
    };
  } catch (error) {
    if (!isDemoMode()) {
      throw error;
    }

    return {
      provider: "fallback",
      insight: buildFallbackInsight(source, "demo-user", {
        provider: "fallback",
        reason: "ai_gateway_failed_or_invalid_output",
      }),
    };
  }
}

function insertPayload(userId: string, insight: AiCoachInsight) {
  return {
    user_id: userId,
    insight_date: insight.insightDate,
    persona: insight.persona,
    summary: insight.summary,
    priority_tasks: insight.priorityTasks,
    nutrition_advice: insight.nutritionAdvice,
    exercise_advice: insight.exerciseAdvice,
    medication_advice: insight.medicationAdvice,
    follow_up_advice: insight.followUpAdvice,
    risk_flags: insight.riskFlags,
    ai_raw_response: insight.aiRawResponse,
  };
}

export async function getTodayCoachInsightForCurrentUser(): Promise<AiCoachInsightResponse> {
  const source = await buildCurrentCoachSource();

  if (!hasSupabaseConfig()) {
    return {
      persisted: false,
      provider: "fallback",
      insight: buildFallbackInsight(source),
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return {
      persisted: false,
      provider: "fallback",
      insight: buildFallbackInsight(source),
    };
  }

  const { data } = await supabase
    .from("ai_coach_insights")
    .select(aiCoachInsightSelect)
    .eq("user_id", user.id)
    .eq("insight_date", dateOnly())
    .maybeSingle<AiCoachInsightRow>();

  if (data) {
    const insight = mapAiCoachInsightRow(data);
    return {
      persisted: true,
      provider: aiProviderFromRaw(insight.aiRawResponse),
      insight,
    };
  }

  return {
    persisted: false,
    provider: "fallback",
    insight: buildFallbackInsight(source, user.id),
  };
}

export async function generateCoachInsightForCurrentUser(
  input: CoachInsightGenerateRequestInput,
): Promise<AiCoachInsightResponse | { error: "UNAUTHENTICATED" | "AI_UNAVAILABLE" | "SERVER_ERROR" }> {
  void input;

  const source = await buildCurrentCoachSource();

  if (!hasSupabaseConfig()) {
    let result: Awaited<ReturnType<typeof createAiInsight>>;

    try {
      result = await createAiInsight(source);
    } catch {
      return {
        error: "AI_UNAVAILABLE",
      };
    }

    return {
      persisted: false,
      provider: result.provider,
      insight: result.insight,
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return { error: "UNAUTHENTICATED" };
  }

  let result: Awaited<ReturnType<typeof createAiInsight>>;

  try {
    result = await createAiInsight(source);
  } catch {
    return {
      error: "AI_UNAVAILABLE",
    };
  }

  const { data, error } = await supabase
    .from("ai_coach_insights")
    .upsert(insertPayload(user.id, { ...result.insight, userId: user.id }), {
      onConflict: "user_id,insight_date",
    })
    .select(aiCoachInsightSelect)
    .single<AiCoachInsightRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" };
  }

  return {
    persisted: true,
    provider: result.provider,
    insight: mapAiCoachInsightRow(data),
  };
}

export async function getCoachInsightHistoryForCurrentUser(limit = 14) {
  if (!hasSupabaseConfig()) {
    const source = await buildCurrentCoachSource();
    return {
      persisted: false,
      items: [buildFallbackInsight(source)],
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return { error: "UNAUTHENTICATED" as const };
  }

  const { data, error } = await supabase
    .from("ai_coach_insights")
    .select(aiCoachInsightSelect)
    .eq("user_id", user.id)
    .order("insight_date", { ascending: false })
    .limit(limit);

  if (error) {
    return { error: "SERVER_ERROR" as const, details: error.message };
  }

  return {
    persisted: true,
    items: ((data || []) as AiCoachInsightRow[]).map(mapAiCoachInsightRow),
  };
}

export async function getLatestCoachInsightForPatient(patientId: string) {
  if (!hasSupabaseConfig()) {
    const source = await buildCurrentCoachSource();
    return buildFallbackInsight(source, patientId);
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return null;
  }

  const { data } = await supabase
    .from("ai_coach_insights")
    .select(aiCoachInsightSelect)
    .eq("user_id", patientId)
    .order("insight_date", { ascending: false })
    .limit(1)
    .maybeSingle<AiCoachInsightRow>();

  return data ? mapAiCoachInsightRow(data) : null;
}
