import type {
  InBodyEstimate,
  InBodyLatestSummary,
  InBodyMetricComparison,
  InBodyRecord,
  InBodyRecordSource,
} from "@/lib/types";

export const inbodySafetyNote =
  "AI 讀取結果僅供記錄與趨勢追蹤，請以原始 InBody 報告與專業人員解讀為準。";

type InBodyRecordRow = {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | string | null;
  skeletal_muscle_kg: number | string | null;
  body_fat_mass_kg: number | string | null;
  body_fat_percentage: number | string | null;
  bmi: number | string | null;
  waist_hip_ratio: number | string | null;
  visceral_fat_area_cm2: number | string | null;
  basal_metabolic_rate_kcal: number | string | null;
  inbody_score: number | string | null;
  note: string | null;
  ai_summary: string | null;
  source: InBodyRecordSource;
  created_at: string;
};

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue * 10) / 10 : null;
}

export function mapInBodyRecordRow(row: InBodyRecordRow): InBodyRecord {
  return {
    id: row.id,
    userId: row.user_id,
    measuredAt: row.measured_at,
    weightKg: toNullableNumber(row.weight_kg),
    skeletalMuscleKg: toNullableNumber(row.skeletal_muscle_kg),
    bodyFatMassKg: toNullableNumber(row.body_fat_mass_kg),
    bodyFatPercentage: toNullableNumber(row.body_fat_percentage),
    bmi: toNullableNumber(row.bmi),
    waistHipRatio: toNullableNumber(row.waist_hip_ratio),
    visceralFatAreaCm2: toNullableNumber(row.visceral_fat_area_cm2),
    basalMetabolicRateKcal: toNullableNumber(row.basal_metabolic_rate_kcal),
    inbodyScore: toNullableNumber(row.inbody_score),
    note: row.note,
    aiSummary: row.ai_summary,
    source: row.source,
    createdAt: row.created_at,
  };
}

function compareMetric(
  current: number | null,
  previous: number | null,
): InBodyMetricComparison {
  return {
    current,
    previous,
    delta:
      current !== null && previous !== null
        ? Math.round((current - previous) * 10) / 10
        : null,
  };
}

export function buildInBodyLatestSummary(
  records: InBodyRecord[],
): InBodyLatestSummary {
  const [latest = null, previous = null] = records;

  return {
    latest,
    previous,
    comparison: {
      weightKg: compareMetric(latest?.weightKg ?? null, previous?.weightKg ?? null),
      skeletalMuscleKg: compareMetric(
        latest?.skeletalMuscleKg ?? null,
        previous?.skeletalMuscleKg ?? null,
      ),
      bodyFatPercentage: compareMetric(
        latest?.bodyFatPercentage ?? null,
        previous?.bodyFatPercentage ?? null,
      ),
      bodyFatMassKg: compareMetric(
        latest?.bodyFatMassKg ?? null,
        previous?.bodyFatMassKg ?? null,
      ),
      visceralFatAreaCm2: compareMetric(
        latest?.visceralFatAreaCm2 ?? null,
        previous?.visceralFatAreaCm2 ?? null,
      ),
    },
  };
}

export function emptyInBodyLatestSummary(): InBodyLatestSummary {
  return buildInBodyLatestSummary([]);
}

export function createFallbackInBodyEstimate(fileName?: string): InBodyEstimate {
  return {
    measuredAt: new Date().toISOString(),
    weightKg: 78.2,
    skeletalMuscleKg: 31.4,
    bodyFatMassKg: 21.6,
    bodyFatPercentage: 27.6,
    bmi: 26.1,
    waistHipRatio: 0.9,
    visceralFatAreaCm2: 92,
    basalMetabolicRateKcal: 1580,
    inbodyScore: 73,
    confidenceScore: 0.5,
    needsManualReview: true,
    aiSummary: fileName
      ? `已產生 ${fileName} 的本機示範讀取值。請依原始 InBody 報告人工確認後再儲存。`
      : "已產生本機示範讀取值。請依原始 InBody 報告人工確認後再儲存。",
    safetyNote: inbodySafetyNote,
  };
}
