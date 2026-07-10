import type {
  Glp1InjectionMethod,
  Glp1InjectionSite,
  Glp1LatestSummary,
  Glp1MedicationLog,
  Glp1MedicationName,
  Glp1SideEffectLog,
} from "@/lib/types";
import type {
  Glp1MedicationLogInput,
  Glp1SideEffectInput,
} from "@/lib/validation";

export const glp1SafetyNotice =
  "本平台僅做 GLP-1 用藥紀錄、提醒、趨勢追蹤與回診溝通輔助，不提供診斷，也不自動調整劑量。所有藥物相關建議均請由醫師評估。";

export const glp1SevereSymptomNotice =
  "若出現嚴重不適、持續嘔吐、脫水疑慮、嚴重腹痛、暈厥或低血糖感，請立即就醫或聯絡醫療人員，並請由醫師評估。";

export const medicationNameLabels: Record<Glp1MedicationName, string> = {
  MOUNJARO: "猛健樂 Mounjaro",
  OZEMPIC: "Ozempic",
  WEGOVY: "Wegovy",
  SAXENDA: "Saxenda／瘦瘦筆",
  OTHER: "其他 GLP-1",
};

export const injectionMethodLabels: Record<Glp1InjectionMethod, string> = {
  self: "自行施打",
  clinic: "診所施打",
  caregiver: "照顧者協助",
  unknown: "未記錄",
};

export const injectionSiteLabels: Record<Glp1InjectionSite, string> = {
  abdomen: "腹部",
  thigh: "大腿",
  upper_arm: "上臂",
  other: "其他",
  unknown: "未記錄",
};

type MedicationLogRow = {
  id: string;
  user_id?: string | null;
  patient_id?: string | null;
  medication_name: Glp1MedicationName;
  dose_mg?: number | string | null;
  dose_label?: string | null;
  injection_date: string;
  next_injection_date?: string | null;
  injection_method?: Glp1InjectionMethod | null;
  injection_site?: Glp1InjectionSite | null;
  lot_number?: string | null;
  note?: string | null;
  notes?: string | null;
  created_at: string;
};

type SideEffectLogRow = {
  id: string;
  user_id: string;
  medication_log_id: string | null;
  nausea_score: number | string | null;
  vomiting: boolean | null;
  constipation_score: number | string | null;
  diarrhea_score: number | string | null;
  appetite_score: number | string | null;
  dizziness: boolean | null;
  hypoglycemia_feeling: boolean | null;
  abdominal_pain_score: number | string | null;
  dehydration_concern: boolean | null;
  note: string | null;
  created_at: string;
};

function padDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function parseDateOnly(dateString: string) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(dateString);
  }

  return new Date(year, month - 1, day);
}

export function toDateOnlyString(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function addDaysToDateString(dateString: string, days: number) {
  const date = parseDateOnly(dateString);
  date.setDate(date.getDate() + days);
  return toDateOnlyString(date);
}

export function getDefaultNextInjectionDate(injectionDate: string) {
  return addDaysToDateString(injectionDate, 7);
}

export function daysUntilDate(dateString: string, now = new Date()) {
  const target = parseDateOnly(dateString);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function isNextInjectionDueSoon(nextInjectionDate: string | null) {
  if (!nextInjectionDate) {
    return false;
  }

  return daysUntilDate(nextInjectionDate) <= 1;
}

export function isHighSideEffectAlert(
  sideEffect:
    | Pick<
        Glp1SideEffectLog,
        | "nauseaScore"
        | "vomiting"
        | "abdominalPainScore"
        | "dehydrationConcern"
      >
    | Glp1SideEffectInput
    | null,
) {
  if (!sideEffect) {
    return false;
  }

  return (
    sideEffect.nauseaScore >= 7 ||
    sideEffect.vomiting ||
    sideEffect.dehydrationConcern ||
    sideEffect.abdominalPainScore >= 7
  );
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function parseDoseLabel(doseLabel: string | null | undefined) {
  if (!doseLabel) {
    return 0;
  }

  const match = doseLabel.match(/\d+(?:\.\d+)?/);
  return match ? toNumber(match[0]) : 0;
}

function toScore(value: number | string | null | undefined) {
  return Math.max(0, Math.min(10, Math.round(toNumber(value))));
}

export function mapGlp1MedicationLogRow(
  row: MedicationLogRow,
): Glp1MedicationLog {
  return {
    id: row.id,
    userId: row.user_id || row.patient_id || "",
    medicationName: row.medication_name,
    doseMg: row.dose_mg ? toNumber(row.dose_mg) : parseDoseLabel(row.dose_label),
    injectionDate: row.injection_date,
    nextInjectionDate:
      row.next_injection_date || getDefaultNextInjectionDate(row.injection_date),
    injectionMethod: row.injection_method || "unknown",
    injectionSite: row.injection_site || "unknown",
    lotNumber: row.lot_number || null,
    note: row.note || row.notes || null,
    createdAt: row.created_at,
  };
}

export function mapGlp1SideEffectLogRow(
  row: SideEffectLogRow,
): Glp1SideEffectLog {
  return {
    id: row.id,
    userId: row.user_id,
    medicationLogId: row.medication_log_id,
    nauseaScore: toScore(row.nausea_score),
    vomiting: Boolean(row.vomiting),
    constipationScore: toScore(row.constipation_score),
    diarrheaScore: toScore(row.diarrhea_score),
    appetiteScore: toScore(row.appetite_score),
    dizziness: Boolean(row.dizziness),
    hypoglycemiaFeeling: Boolean(row.hypoglycemia_feeling),
    abdominalPainScore: toScore(row.abdominal_pain_score),
    dehydrationConcern: Boolean(row.dehydration_concern),
    note: row.note,
    createdAt: row.created_at,
  };
}

export function buildGlp1MedicationLog(
  input: Glp1MedicationLogInput,
  userId: string,
  id = "demo-glp1-log",
): Glp1MedicationLog {
  return {
    id,
    userId,
    medicationName: input.medicationName,
    doseMg: input.doseMg,
    injectionDate: input.injectionDate,
    nextInjectionDate:
      input.nextInjectionDate || getDefaultNextInjectionDate(input.injectionDate),
    injectionMethod: input.injectionMethod,
    injectionSite: input.injectionSite,
    lotNumber: input.lotNumber || null,
    note: input.note || null,
    createdAt: new Date().toISOString(),
  };
}

export function buildGlp1SideEffectLog(
  input: Glp1SideEffectInput,
  userId: string,
  id = "demo-glp1-side-effect",
): Glp1SideEffectLog {
  return {
    id,
    userId,
    medicationLogId: input.medicationLogId || null,
    nauseaScore: input.nauseaScore,
    vomiting: input.vomiting,
    constipationScore: input.constipationScore,
    diarrheaScore: input.diarrheaScore,
    appetiteScore: input.appetiteScore,
    dizziness: input.dizziness,
    hypoglycemiaFeeling: input.hypoglycemiaFeeling,
    abdominalPainScore: input.abdominalPainScore,
    dehydrationConcern: input.dehydrationConcern,
    note: input.note || null,
    createdAt: new Date().toISOString(),
  };
}

export function buildGlp1LatestSummary(
  medicationLog: Glp1MedicationLog | null,
  sideEffectLog: Glp1SideEffectLog | null,
): Glp1LatestSummary {
  const daysUntilNextInjection = medicationLog
    ? daysUntilDate(medicationLog.nextInjectionDate)
    : null;

  return {
    latestMedicationLog: medicationLog,
    latestSideEffectLog: sideEffectLog,
    daysUntilNextInjection,
    nextInjectionDueSoon:
      daysUntilNextInjection !== null && daysUntilNextInjection <= 1,
    highSideEffectAlert: isHighSideEffectAlert(sideEffectLog),
    safetyNotice: glp1SafetyNotice,
    severeSymptomNotice: glp1SevereSymptomNotice,
  };
}

export function emptyGlp1LatestSummary(): Glp1LatestSummary {
  return buildGlp1LatestSummary(null, null);
}
