import { personaLabels } from "@/lib/assessment";
import { getCurrentUser } from "@/lib/auth";
import {
  buildEngagementSummary,
  createDemoEngagementMetrics,
  emptyEngagementSummary,
  engagementMetricSelect,
  mapEngagementMetricRow,
} from "@/lib/engagement";
import {
  buildGlp1LatestSummary,
  glp1SafetyNotice,
  glp1SevereSymptomNotice,
  isHighSideEffectAlert,
  mapGlp1MedicationLogRow,
  mapGlp1SideEffectLogRow,
  medicationNameLabels,
} from "@/lib/glp1";
import {
  glp1MedicationLogSelect,
  glp1SideEffectLogSelect,
} from "@/lib/glp1-data";
import {
  buildInBodyLatestSummary,
  mapInBodyRecordRow,
} from "@/lib/inbody";
import { calculateNutritionSummary, mapFoodLogRow } from "@/lib/nutrition";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  AssessmentResult,
  ClinicPatientDetail,
  ClinicVisitReport,
  EngagementMetric,
  EngagementSummary,
  FoodLog,
  Glp1MedicationLog,
  Glp1SideEffectLog,
  InBodyRecord,
  SideEffectTrendPoint,
  TimeWindowSummary,
  TrainingLog,
  TrainingWindowSummary,
  TrendPoint,
  VisitReportSummary,
} from "@/lib/types";

const foodLogSelect =
  "id,user_id,meal_type,meal_name,calories_kcal,protein_g,carbs_g,fat_g,fiber_g,sodium_mg,source,note,eaten_at,created_at";

const trainingLogSelect =
  "id,patient_id,trained_on,activity_type,duration_minutes,intensity,notes,created_at";

const clinicVisitReportSelect =
  "id,patient_id,generated_by,report_period_start,report_period_end,ai_summary,plain_text_summary,created_at";

type ProfileRow = {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
};

type AssessmentRow = {
  persona: AssessmentResult["persona"];
  recommended_path: string;
  risk_flags: string[] | null;
  needs_medical_review: boolean;
  safety_message: string;
  today_recommendations: AssessmentResult["todayRecommendations"];
  completed_at: string;
};

type TrainingLogRow = {
  id: string;
  patient_id: string;
  trained_on: string;
  activity_type: string;
  duration_minutes: number | string | null;
  intensity: TrainingLog["intensity"];
  notes: string | null;
  created_at: string;
};

type ClinicVisitReportRow = {
  id: string;
  patient_id: string;
  generated_by: string | null;
  report_period_start: string;
  report_period_end: string;
  ai_summary: VisitReportSummary;
  plain_text_summary: string;
  created_at: string;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function dateOnly(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateOnly(date);
}

function daysAgo(days: number) {
  return addDays(dateOnly(), -days);
}

function calculateAge(dateOfBirth: string | null) {
  if (!dateOfBirth) {
    return null;
  }

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return Number.isFinite(age) ? age : null;
}

function mapAssessment(row: AssessmentRow | null): AssessmentResult | null {
  if (!row) {
    return null;
  }

  return {
    persona: row.persona,
    personaLabel: personaLabels[row.persona],
    recommendedPath: row.recommended_path,
    riskFlags: (row.risk_flags || []) as AssessmentResult["riskFlags"],
    needsMedicalReview: row.needs_medical_review,
    safetyMessage: row.safety_message,
    todayRecommendations: row.today_recommendations,
    completedAt: row.completed_at,
  };
}

function mapTrainingLogRow(row: TrainingLogRow): TrainingLog {
  return {
    id: row.id,
    userId: row.patient_id,
    trainedOn: row.trained_on,
    activityType: row.activity_type,
    durationMinutes: toNumber(row.duration_minutes),
    intensity: row.intensity,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function toTrend(records: InBodyRecord[], key: keyof InBodyRecord): TrendPoint[] {
  return [...records]
    .reverse()
    .map((record) => ({
      date: record.measuredAt.slice(0, 10),
      value:
        typeof record[key] === "number"
          ? (record[key] as number)
          : null,
    }));
}

function foodWindowSummary(
  logs: FoodLog[],
  days: 7 | 30,
): TimeWindowSummary {
  const startDate = daysAgo(days - 1);
  const inWindow = logs.filter((log) => log.eatenAt.slice(0, 10) >= startDate);
  const summary = calculateNutritionSummary(inWindow);

  return {
    days,
    logCount: inWindow.length,
    averageCaloriesKcal:
      days > 0 ? Math.round(summary.caloriesKcal / days) : 0,
    averageProteinG:
      days > 0 ? Math.round((summary.proteinG / days) * 10) / 10 : 0,
    proteinTargetRate: summary.proteinTargetRate,
  };
}

function trainingWindowSummary(
  logs: TrainingLog[],
  days: 7 | 30,
): TrainingWindowSummary {
  const startDate = daysAgo(days - 1);
  const inWindow = logs.filter((log) => log.trainedOn >= startDate);
  const expectedWorkouts = days === 7 ? 3 : 12;
  const totalMinutes = inWindow.reduce(
    (total, log) => total + log.durationMinutes,
    0,
  );

  return {
    days,
    workoutCount: inWindow.length,
    totalMinutes,
    executionRate: Math.min(
      100,
      Math.round((inWindow.length / expectedWorkouts) * 100),
    ),
  };
}

function sideEffectTrend(logs: Glp1SideEffectLog[]): SideEffectTrendPoint[] {
  return logs
    .slice(0, 30)
    .reverse()
    .map((log) => ({
      date: log.createdAt.slice(0, 10),
      nauseaScore: log.nauseaScore,
      abdominalPainScore: log.abdominalPainScore,
      vomiting: log.vomiting,
      dehydrationConcern: log.dehydrationConcern,
    }));
}

function daysSinceIso(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - date.getTime()) / 86400000));
}

function mapClinicVisitReportRow(row: ClinicVisitReportRow): ClinicVisitReport {
  return {
    id: row.id,
    patientId: row.patient_id,
    generatedBy: row.generated_by,
    reportPeriodStart: row.report_period_start,
    reportPeriodEnd: row.report_period_end,
    aiSummary: row.ai_summary,
    plainTextSummary: row.plain_text_summary,
    createdAt: row.created_at,
  };
}

function buildRiskAlerts(input: {
  assessment: AssessmentResult | null;
  glp1Summary: ReturnType<typeof buildGlp1LatestSummary>;
  engagement: EngagementSummary;
  daysUnreported: number | null;
}) {
  const alerts: string[] = [];

  if (input.assessment?.needsMedicalReview) {
    alerts.push("健康評估顯示需醫師或專業人員先評估。");
  }

  if (input.glp1Summary.highSideEffectAlert) {
    alerts.push("GLP-1 副作用偏高，建議回診與醫師討論。");
  }

  if (input.glp1Summary.nextInjectionDueSoon) {
    alerts.push("下一次 GLP-1 施打時間接近或已逾期，請依醫囑確認。");
  }

  if (input.engagement.lowEngagementAlert) {
    alerts.push("7 天未登入或登入不足，可能需要關懷追蹤。");
  }

  if (input.engagement.foodMissingAlert) {
    alerts.push("飲食 3 天未記錄，營養趨勢可能不足。");
  }

  if (input.engagement.glp1MissingAlert || (input.daysUnreported ?? 0) >= 7) {
    alerts.push("GLP-1 或副作用近期未回報，請於回診時確認。");
  }

  return alerts;
}

function createPlainTextSummary(summary: VisitReportSummary) {
  return [
    `近 30 天體重變化：${summary.weightChange30d}`,
    `骨骼肌變化：${summary.skeletalMuscleChange}`,
    `體脂率變化：${summary.bodyFatPercentageChange}`,
    `蛋白質達標：${summary.proteinTargetStatus}`,
    `運動執行率：${summary.exerciseExecutionRate}`,
    `GLP-1 依從性：${summary.glp1Adherence}`,
    `副作用摘要：${summary.sideEffectSummary}`,
    `醫師關注：${summary.physicianAttentionItems.join("；")}`,
    `回診溝通：${summary.visitCommunicationPoints.join("；")}`,
    summary.safetyNotice,
  ].join("\n");
}

export function createFallbackVisitReport(
  detail: ClinicPatientDetail,
): VisitReportSummary {
  const current = detail.inbody.history[0] || null;
  const previous = detail.inbody.history[detail.inbody.history.length - 1] || null;
  const weightDelta =
    current?.weightKg !== null &&
    current?.weightKg !== undefined &&
    previous?.weightKg !== null &&
    previous?.weightKg !== undefined
      ? Math.round((current.weightKg - previous.weightKg) * 10) / 10
      : null;
  const muscleDelta =
    current?.skeletalMuscleKg !== null &&
    current?.skeletalMuscleKg !== undefined &&
    previous?.skeletalMuscleKg !== null &&
    previous?.skeletalMuscleKg !== undefined
      ? Math.round((current.skeletalMuscleKg - previous.skeletalMuscleKg) * 10) / 10
      : null;
  const fatDelta =
    current?.bodyFatPercentage !== null &&
    current?.bodyFatPercentage !== undefined &&
    previous?.bodyFatPercentage !== null &&
    previous?.bodyFatPercentage !== undefined
      ? Math.round((current.bodyFatPercentage - previous.bodyFatPercentage) * 10) / 10
      : null;

  return {
    weightChange30d:
      weightDelta === null ? "資料不足，建議持續追蹤。" : `${weightDelta} kg`,
    skeletalMuscleChange:
      muscleDelta === null ? "資料不足，建議持續追蹤。" : `${muscleDelta} kg`,
    bodyFatPercentageChange:
      fatDelta === null ? "資料不足，建議持續追蹤。" : `${fatDelta}%`,
    proteinTargetStatus: `近 30 天蛋白質達標率約 ${detail.nutrition.summary30d.proteinTargetRate}%。`,
    exerciseExecutionRate: `近 30 天運動執行率約 ${detail.training.summary30d.executionRate}%。`,
    glp1Adherence: detail.glp1.latestMedicationLog
      ? `最近一次施打為 ${detail.glp1.latestMedicationLog.injectionDate}，下次預計 ${detail.glp1.latestMedicationLog.nextInjectionDate}。劑量調整請由醫師評估。`
      : "尚未建立 GLP-1 施打紀錄，請於回診確認是否需要追蹤。",
    sideEffectSummary: detail.glp1.latestSideEffectLog
      ? `最近副作用：噁心 ${detail.glp1.latestSideEffectLog.nauseaScore}/10，腹痛 ${detail.glp1.latestSideEffectLog.abdominalPainScore}/10。`
      : "尚未有副作用回報。",
    physicianAttentionItems:
      detail.riskAlerts.length > 0
        ? detail.riskAlerts
        : ["目前無高風險警示，但醫療與用藥決策仍請由醫師評估。"],
    visitCommunicationPoints: [
      "確認近期體重、體脂與骨骼肌趨勢是否符合照護目標。",
      "討論蛋白質攝取、運動執行與副作用回報是否需要加強。",
      "GLP-1 劑量或施打安排不由系統建議，請由醫師評估。",
    ],
    safetyNotice:
      "本報告僅供回診溝通輔助，不提供診斷、不自動調整藥物劑量；所有用藥與劑量調整請由醫師評估。",
  };
}

function buildDetailFromRecords(input: {
  profile: ProfileRow;
  assessment: AssessmentResult | null;
  inbodyRecords: InBodyRecord[];
  foodLogs: FoodLog[];
  trainingLogs: TrainingLog[];
  glp1Logs: Glp1MedicationLog[];
  sideEffectLogs: Glp1SideEffectLog[];
  engagementMetrics: EngagementMetric[];
  latestVisitReport: ClinicVisitReport | null;
}): ClinicPatientDetail {
  const latestGlp1Log = input.glp1Logs[0] || null;
  const latestSideEffectLog = input.sideEffectLogs[0] || null;
  const glp1Summary = buildGlp1LatestSummary(
    latestGlp1Log,
    latestSideEffectLog,
  );
  const daysUnreported = daysSinceIso(latestSideEffectLog?.createdAt);
  const engagement = buildEngagementSummary(input.engagementMetrics);
  const patient: ClinicPatientDetail["patient"] = {
    id: input.profile.id,
    fullName: input.profile.full_name || "未命名病人",
    dateOfBirth: input.profile.date_of_birth,
    sex: input.profile.sex,
    age: calculateAge(input.profile.date_of_birth),
    latestWeightKg: input.inbodyRecords[0]?.weightKg ?? null,
    glp1Status: latestGlp1Log
      ? `${medicationNameLabels[latestGlp1Log.medicationName]} ${latestGlp1Log.doseMg} mg`
      : "尚未回報 GLP-1",
    lastCheckInAt:
      latestSideEffectLog?.createdAt ||
      latestGlp1Log?.createdAt ||
      input.engagementMetrics[0]?.createdAt ||
      null,
    riskFlag: isHighSideEffectAlert(latestSideEffectLog)
      ? "NEEDS_REVIEW"
      : glp1Summary.nextInjectionDueSoon || engagement.lowEngagementAlert
        ? "WATCH"
        : "LOW",
  };
  const riskAlerts = buildRiskAlerts({
    assessment: input.assessment,
    glp1Summary,
    engagement,
    daysUnreported,
  });

  return {
    patient,
    latestAssessment: input.assessment,
    inbody: {
      latest: buildInBodyLatestSummary(input.inbodyRecords).latest,
      history: input.inbodyRecords,
      weightTrend: toTrend(input.inbodyRecords, "weightKg"),
      bodyFatTrend: toTrend(input.inbodyRecords, "bodyFatPercentage"),
      skeletalMuscleTrend: toTrend(input.inbodyRecords, "skeletalMuscleKg"),
    },
    nutrition: {
      summary7d: foodWindowSummary(input.foodLogs, 7),
      summary30d: foodWindowSummary(input.foodLogs, 30),
    },
    training: {
      summary7d: trainingWindowSummary(input.trainingLogs, 7),
      summary30d: trainingWindowSummary(input.trainingLogs, 30),
      recentLogs: input.trainingLogs.slice(0, 10),
    },
    glp1: {
      ...glp1Summary,
      history: input.glp1Logs,
      sideEffectTrend: sideEffectTrend(input.sideEffectLogs),
      daysUnreported,
    },
    engagement,
    riskAlerts,
    latestVisitReport: input.latestVisitReport,
  };
}

function createDemoDetail(patientId: string): ClinicPatientDetail {
  const today = dateOnly();
  const inbodyRecords: InBodyRecord[] = [
    {
      id: "demo-inbody-current",
      userId: patientId,
      measuredAt: today,
      weightKg: 84.2,
      skeletalMuscleKg: 31.8,
      bodyFatMassKg: 24.1,
      bodyFatPercentage: 28.6,
      bmi: 27.1,
      waistHipRatio: 0.91,
      visceralFatAreaCm2: 96,
      basalMetabolicRateKcal: 1610,
      inbodyScore: 74,
      note: null,
      aiSummary: "體重下降中，骨骼肌需持續保留。",
      source: "manual",
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-inbody-previous",
      userId: patientId,
      measuredAt: daysAgo(28),
      weightKg: 87.1,
      skeletalMuscleKg: 32.1,
      bodyFatMassKg: 26.4,
      bodyFatPercentage: 30.3,
      bmi: 28,
      waistHipRatio: 0.94,
      visceralFatAreaCm2: 104,
      basalMetabolicRateKcal: 1622,
      inbodyScore: 71,
      note: null,
      aiSummary: null,
      source: "manual",
      createdAt: new Date().toISOString(),
    },
  ];
  const foodLogs: FoodLog[] = Array.from({ length: 18 }).map((_, index) => ({
    id: `demo-food-${index}`,
    userId: patientId,
    mealType: index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner",
    mealName: "示範餐點",
    caloriesKcal: 520,
    proteinG: index % 2 === 0 ? 32 : 22,
    carbsG: 58,
    fatG: 18,
    fiberG: 5,
    sodiumMg: 780,
    source: "manual",
    note: null,
    eatenAt: `${daysAgo(index)}T12:00:00.000Z`,
    createdAt: `${daysAgo(index)}T12:10:00.000Z`,
  }));
  const trainingLogs: TrainingLog[] = [0, 2, 5, 9, 14, 21].map((offset) => ({
    id: `demo-training-${offset}`,
    userId: patientId,
    trainedOn: daysAgo(offset),
    activityType: offset % 2 === 0 ? "低衝擊重訓" : "步行",
    durationMinutes: offset % 2 === 0 ? 45 : 30,
    intensity: offset % 2 === 0 ? "MEDIUM" : "LOW",
    notes: null,
    createdAt: `${daysAgo(offset)}T09:00:00.000Z`,
  }));
  const glp1Logs: Glp1MedicationLog[] = [1, 8, 15, 22].map((offset) => ({
    id: `demo-glp1-${offset}`,
    userId: patientId,
    medicationName: "MOUNJARO",
    doseMg: 2.5,
    injectionDate: daysAgo(offset),
    nextInjectionDate: addDays(daysAgo(offset), 7),
    injectionMethod: "clinic",
    injectionSite: "abdomen",
    lotNumber: null,
    note: "請由醫師評估。",
    createdAt: `${daysAgo(offset)}T10:00:00.000Z`,
  }));
  const sideEffectLogs: Glp1SideEffectLog[] = [0, 7, 14].map((offset, index) => ({
    id: `demo-side-effect-${offset}`,
    userId: patientId,
    medicationLogId: glp1Logs[index]?.id || null,
    nauseaScore: index === 0 ? 7 : 4,
    vomiting: false,
    constipationScore: 3,
    diarrheaScore: 0,
    appetiteScore: 5,
    dizziness: false,
    hypoglycemiaFeeling: false,
    abdominalPainScore: index === 0 ? 2 : 1,
    dehydrationConcern: false,
    note: index === 0 ? "噁心偏高，建議回診討論。" : null,
    createdAt: `${daysAgo(offset)}T18:00:00.000Z`,
  }));
  const assessment: AssessmentResult = {
    persona: "glp1_weight_loss",
    personaLabel: personaLabels.glp1_weight_loss,
    recommendedPath: "強調蛋白質、肌肉保留、低噁心飲食、步行與副作用追蹤。",
    riskFlags: [],
    needsMedicalReview: false,
    safetyMessage: "不診斷、不自動調藥；請由醫師評估。",
    todayRecommendations: {
      exercise: "步行 20-30 分鐘，搭配低衝擊肌力。",
      nutrition: "優先達成蛋白質攝取並觀察噁心。",
      medication: "記錄 GLP-1 使用與副作用，請由醫師評估。",
      followUp: "回診時帶上近 30 天紀錄。",
    },
    completedAt: `${daysAgo(30)}T08:00:00.000Z`,
  };

  const detail = buildDetailFromRecords({
    profile: {
      id: patientId,
      full_name: patientId === "demo-2" ? "陳美玲" : "王小明",
      date_of_birth: patientId === "demo-2" ? "1959-10-02" : "1984-03-15",
      sex: patientId === "demo-2" ? "female" : "male",
    },
    assessment,
    inbodyRecords,
    foodLogs,
    trainingLogs,
    glp1Logs,
    sideEffectLogs,
    engagementMetrics: createDemoEngagementMetrics(patientId),
    latestVisitReport: null,
  });

  detail.latestVisitReport = {
    id: "demo-visit-report",
    patientId,
    generatedBy: "demo-clinic-user",
    reportPeriodStart: daysAgo(30),
    reportPeriodEnd: today,
    aiSummary: createFallbackVisitReport(detail),
    plainTextSummary: createPlainTextSummary(createFallbackVisitReport(detail)),
    createdAt: new Date().toISOString(),
  };

  return detail;
}

export async function getCurrentPatientEngagementSummary(): Promise<EngagementSummary> {
  if (!hasSupabaseConfig()) {
    return buildEngagementSummary(createDemoEngagementMetrics("demo-user"));
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return emptyEngagementSummary();
  }

  const { data, error } = await supabase
    .from("engagement_metrics")
    .select(engagementMetricSelect)
    .eq("user_id", user.id)
    .gte("metric_date", daysAgo(29))
    .order("metric_date", { ascending: false });

  if (error || !data || data.length === 0) {
    return emptyEngagementSummary();
  }

  return buildEngagementSummary(data.map(mapEngagementMetricRow));
}

export async function getClinicPatientDetail(
  patientId: string,
): Promise<ClinicPatientDetail | null> {
  if (!hasSupabaseConfig()) {
    return createDemoDetail(patientId);
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,date_of_birth,sex")
    .eq("id", patientId)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) {
    return null;
  }

  const [
    assessmentResult,
    inbodyResult,
    foodResult,
    trainingResult,
    glp1Result,
    sideEffectResult,
    engagementResult,
    visitReportResult,
  ] = await Promise.all([
    supabase
      .from("assessment_results")
      .select(
        "persona,recommended_path,risk_flags,needs_medical_review,safety_message,today_recommendations,completed_at",
      )
      .eq("user_id", patientId)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle<AssessmentRow>(),
    supabase
      .from("inbody_records")
      .select(
        "id,user_id,measured_at,weight_kg,skeletal_muscle_kg,body_fat_mass_kg,body_fat_percentage,bmi,waist_hip_ratio,visceral_fat_area_cm2,basal_metabolic_rate_kcal,inbody_score,note,ai_summary,source,created_at",
      )
      .eq("user_id", patientId)
      .gte("measured_at", `${daysAgo(59)}T00:00:00.000Z`)
      .order("measured_at", { ascending: false }),
    supabase
      .from("food_logs")
      .select(foodLogSelect)
      .eq("user_id", patientId)
      .gte("eaten_at", `${daysAgo(29)}T00:00:00.000Z`)
      .order("eaten_at", { ascending: false }),
    supabase
      .from("training_logs")
      .select(trainingLogSelect)
      .eq("patient_id", patientId)
      .gte("trained_on", daysAgo(29))
      .order("trained_on", { ascending: false }),
    supabase
      .from("glp1_medication_logs")
      .select(glp1MedicationLogSelect)
      .or(`user_id.eq.${patientId},patient_id.eq.${patientId}`)
      .order("injection_date", { ascending: false })
      .limit(12),
    supabase
      .from("glp1_side_effect_logs")
      .select(glp1SideEffectLogSelect)
      .eq("user_id", patientId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("engagement_metrics")
      .select(engagementMetricSelect)
      .eq("user_id", patientId)
      .gte("metric_date", daysAgo(29))
      .order("metric_date", { ascending: false }),
    supabase
      .from("clinic_visit_reports")
      .select(clinicVisitReportSelect)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<ClinicVisitReportRow>(),
  ]);

  return buildDetailFromRecords({
    profile,
    assessment: mapAssessment(assessmentResult.data || null),
    inbodyRecords: (inbodyResult.data || []).map(mapInBodyRecordRow),
    foodLogs: (foodResult.data || []).map(mapFoodLogRow),
    trainingLogs: (trainingResult.data || []).map(mapTrainingLogRow),
    glp1Logs: (glp1Result.data || []).map(mapGlp1MedicationLogRow),
    sideEffectLogs: (sideEffectResult.data || []).map(mapGlp1SideEffectLogRow),
    engagementMetrics: (engagementResult.data || []).map(mapEngagementMetricRow),
    latestVisitReport: visitReportResult.data
      ? mapClinicVisitReportRow(visitReportResult.data)
      : null,
  });
}

export function buildVisitReportPlainText(summary: VisitReportSummary) {
  return createPlainTextSummary(summary);
}

export function buildVisitReportSource(detail: ClinicPatientDetail) {
  return {
    patient: {
      id: detail.patient.id,
      fullName: detail.patient.fullName,
      age: detail.patient.age,
      persona: detail.latestAssessment?.personaLabel || null,
    },
    inbody: {
      latest: detail.inbody.latest,
      weightTrend: detail.inbody.weightTrend,
      bodyFatTrend: detail.inbody.bodyFatTrend,
      skeletalMuscleTrend: detail.inbody.skeletalMuscleTrend,
    },
    nutrition: detail.nutrition,
    training: detail.training,
    glp1: {
      latestMedicationLog: detail.glp1.latestMedicationLog,
      latestSideEffectLog: detail.glp1.latestSideEffectLog,
      daysUntilNextInjection: detail.glp1.daysUntilNextInjection,
      daysUnreported: detail.glp1.daysUnreported,
      sideEffectTrend: detail.glp1.sideEffectTrend,
    },
    engagement: detail.engagement,
    riskAlerts: detail.riskAlerts,
    safetyRules: [
      glp1SafetyNotice,
      glp1SevereSymptomNotice,
      "不得診斷，不得自動調整藥物劑量；劑量調整一律顯示「請由醫師評估」。",
    ],
  };
}

export function getReportPeriod(input?: {
  reportPeriodStart?: string;
  reportPeriodEnd?: string;
}) {
  return {
    reportPeriodStart: input?.reportPeriodStart || daysAgo(29),
    reportPeriodEnd: input?.reportPeriodEnd || dateOnly(),
  };
}
