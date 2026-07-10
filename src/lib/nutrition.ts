import type {
  FoodLog,
  FoodLogSource,
  FoodMealType,
  NutritionEstimate,
  TodayNutritionSummary,
} from "@/lib/types";

export const nutritionSafetyNote =
  "AI 營養估算僅供參考，實際熱量會因份量與料理方式不同。";

export const medicalNutritionSafetyNote =
  "若您有糖尿病、腎臟病或高風險狀況，請依醫師或營養師建議調整飲食。";

export const defaultProteinTargetG = 90;

export const mealTypeLabels: Record<FoodMealType, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "點心",
  other: "其他",
};

type FoodLogLike = {
  id: string;
  user_id: string;
  meal_type: FoodMealType;
  meal_name: string;
  calories_kcal: number | string | null;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fat_g: number | string | null;
  fiber_g: number | string | null;
  sodium_mg: number | string | null;
  source: FoodLogSource;
  note: string | null;
  eaten_at: string;
  created_at: string;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}

export function mapFoodLogRow(row: FoodLogLike): FoodLog {
  return {
    id: row.id,
    userId: row.user_id,
    mealType: row.meal_type,
    mealName: row.meal_name,
    caloriesKcal: roundOne(toNumber(row.calories_kcal)),
    proteinG: roundOne(toNumber(row.protein_g)),
    carbsG: roundOne(toNumber(row.carbs_g)),
    fatG: roundOne(toNumber(row.fat_g)),
    fiberG: roundOne(toNumber(row.fiber_g)),
    sodiumMg: roundOne(toNumber(row.sodium_mg)),
    source: row.source,
    note: row.note,
    eatenAt: row.eaten_at,
    createdAt: row.created_at,
  };
}

export function calculateNutritionSummary(
  logs: Array<
    Pick<
      FoodLog,
      "caloriesKcal" | "proteinG" | "carbsG" | "fatG"
    >
  >,
  proteinTargetG = defaultProteinTargetG,
): TodayNutritionSummary {
  const summary = logs.reduce(
    (total, log) => ({
      caloriesKcal: total.caloriesKcal + log.caloriesKcal,
      proteinG: total.proteinG + log.proteinG,
      carbsG: total.carbsG + log.carbsG,
      fatG: total.fatG + log.fatG,
    }),
    { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return {
    caloriesKcal: Math.round(summary.caloriesKcal),
    proteinG: roundOne(summary.proteinG),
    carbsG: roundOne(summary.carbsG),
    fatG: roundOne(summary.fatG),
    proteinTargetG,
    proteinTargetRate:
      proteinTargetG > 0
        ? Math.min(200, Math.round((summary.proteinG / proteinTargetG) * 100))
        : 0,
    logCount: logs.length,
  };
}

export function emptyNutritionSummary(): TodayNutritionSummary {
  return calculateNutritionSummary([]);
}

export function createFallbackNutritionEstimate(fileName?: string): NutritionEstimate {
  return {
    mealName: fileName ? `待確認餐點：${fileName}` : "待確認餐點",
    caloriesKcalMin: 420,
    caloriesKcalMax: 620,
    caloriesKcal: 520,
    proteinGMin: 20,
    proteinGMax: 36,
    proteinG: 28,
    fatGMin: 12,
    fatGMax: 24,
    fatG: 18,
    carbsGMin: 45,
    carbsGMax: 70,
    carbsG: 58,
    fiberGMin: 3,
    fiberGMax: 9,
    fiberG: 6,
    sodiumMgMin: 560,
    sodiumMgMax: 980,
    sodiumMg: 780,
    confidenceScore: 0.52,
    portionNotes:
      "目前為本機示範估算值。上線後會依照片中的餐點、容器比例與可見份量產生估算。",
    advice:
      "建議確認主食份量、蛋白質來源與醬料用量。若正在使用 GLP-1，優先記錄蛋白質與噁心感變化，藥物與飲食調整請由醫師或營養師評估。",
    safetyNote: nutritionSafetyNote,
  };
}
