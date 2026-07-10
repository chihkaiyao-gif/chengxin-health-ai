import { getCurrentUser } from "@/lib/auth";
import {
  buildGlp1LatestSummary,
  emptyGlp1LatestSummary,
  isHighSideEffectAlert,
  isNextInjectionDueSoon,
  mapGlp1MedicationLogRow,
  mapGlp1SideEffectLogRow,
} from "@/lib/glp1";
import { getClinicPatientEngagementOverviews } from "@/lib/patient-engagement";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  ClinicGlp1AlertPatient,
  Glp1LatestSummary,
  Glp1MedicationLog,
  Glp1MedicationName,
  Glp1SideEffectLog,
  PatientEngagementOverview,
} from "@/lib/types";

export const glp1MedicationLogSelect =
  "id,user_id,patient_id,medication_name,dose_mg,dose_label,injection_date,next_injection_date,injection_method,injection_site,lot_number,note,notes,created_at";

export const glp1SideEffectLogSelect =
  "id,user_id,medication_log_id,nausea_score,vomiting,constipation_score,diarrhea_score,appetite_score,dizziness,hypoglycemia_feeling,abdominal_pain_score,dehydration_concern,note,created_at";

const medicationNameLabels: Record<Glp1MedicationName, string> = {
  MOUNJARO: "猛健樂 Mounjaro",
  OZEMPIC: "Ozempic",
  WEGOVY: "Wegovy",
  SAXENDA: "Saxenda／瘦瘦筆",
  OTHER: "其他 GLP-1",
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
};

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

function isOlderThanDays(isoDate: string | null | undefined, days: number) {
  if (!isoDate) {
    return true;
  }

  const date = new Date(isoDate);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date < cutoff;
}

function buildPatientAlert(
  profile: ProfileRow,
  latestGlp1Log: Glp1MedicationLog | null,
  latestSideEffectLog: Glp1SideEffectLog | null,
  engagement?: PatientEngagementOverview,
): ClinicGlp1AlertPatient {
  const highSideEffectAlert = isHighSideEffectAlert(latestSideEffectLog);
  const nextInjectionDate = latestGlp1Log?.nextInjectionDate || null;
  const nextInjectionDueSoon = isNextInjectionDueSoon(nextInjectionDate);
  const missingRecentReport =
    Boolean(latestGlp1Log) && isOlderThanDays(latestSideEffectLog?.createdAt, 14);

  return {
    id: profile.id,
    fullName: profile.full_name || "未命名病人",
    age: calculateAge(profile.date_of_birth),
    latestWeightKg: null,
    glp1Status: latestGlp1Log
      ? `${medicationNameLabels[latestGlp1Log.medicationName]} ${latestGlp1Log.doseMg} mg`
      : "未使用或尚未回報 GLP-1",
    lastCheckInAt: latestSideEffectLog?.createdAt || latestGlp1Log?.createdAt || null,
    riskFlag: highSideEffectAlert
      ? "NEEDS_REVIEW"
      : nextInjectionDueSoon || missingRecentReport || engagement?.lowEngagementAlert
        ? "WATCH"
        : "LOW",
    latestGlp1Log,
    latestSideEffectLog,
    nextInjectionDate,
    nextInjectionDueSoon,
    highSideEffectAlert,
    missingRecentReport,
    engagement,
  };
}

function demoEngagement(patientId: string): PatientEngagementOverview {
  const values: Record<string, PatientEngagementOverview> = {
    "demo-1": {
      consecutiveLoginDays: 9,
      todayTaskCompletionRate: 86,
      lowEngagementAlert: false,
      recentBadgeName: "GLP-1準時王",
      recentBadgeIcon: "syringe",
    },
    "demo-2": {
      consecutiveLoginDays: 4,
      todayTaskCompletionRate: 68,
      lowEngagementAlert: false,
      recentBadgeName: "InBody追蹤者",
      recentBadgeIcon: "scan-line",
    },
    "demo-3": {
      consecutiveLoginDays: 0,
      todayTaskCompletionRate: 28,
      lowEngagementAlert: true,
      recentBadgeName: null,
      recentBadgeIcon: null,
    },
  };

  return (
    values[patientId] || {
      consecutiveLoginDays: 0,
      todayTaskCompletionRate: 0,
      lowEngagementAlert: true,
      recentBadgeName: null,
      recentBadgeIcon: null,
    }
  );
}

function getDemoClinicGlp1Alerts(): ClinicGlp1AlertPatient[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const log: Glp1MedicationLog = {
    id: "demo-glp1-log-clinic",
    userId: "demo-1",
    medicationName: "MOUNJARO",
    doseMg: 2.5,
    injectionDate: yesterday.toISOString().slice(0, 10),
    nextInjectionDate: tomorrow.toISOString().slice(0, 10),
    injectionMethod: "clinic",
    injectionSite: "abdomen",
    lotNumber: null,
    note: "Demo：回診前追蹤用。",
    createdAt: yesterday.toISOString(),
  };

  const sideEffect: Glp1SideEffectLog = {
    id: "demo-glp1-side-effect-clinic",
    userId: "demo-1",
    medicationLogId: log.id,
    nauseaScore: 8,
    vomiting: false,
    constipationScore: 4,
    diarrheaScore: 0,
    appetiteScore: 3,
    dizziness: false,
    hypoglycemiaFeeling: false,
    abdominalPainScore: 2,
    dehydrationConcern: false,
    note: "噁心偏高，建議回診與醫師討論。",
    createdAt: today.toISOString(),
  };

  return [
    buildPatientAlert(
      { id: "demo-1", full_name: "王小晴", date_of_birth: "1984-03-15" },
      log,
      sideEffect,
      demoEngagement("demo-1"),
    ),
    buildPatientAlert(
      { id: "demo-2", full_name: "陳美華", date_of_birth: "1959-10-02" },
      null,
      null,
      demoEngagement("demo-2"),
    ),
    {
      ...buildPatientAlert(
        { id: "demo-3", full_name: "林建宇", date_of_birth: "1991-05-24" },
        {
          ...log,
          id: "demo-glp1-log-overdue",
          userId: "demo-3",
          nextInjectionDate: yesterday.toISOString().slice(0, 10),
        },
        null,
        demoEngagement("demo-3"),
      ),
      missingRecentReport: true,
    },
  ];
}

export async function getGlp1HistoryForCurrentUser(
  limit = 20,
): Promise<Glp1MedicationLog[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("glp1_medication_logs")
    .select(glp1MedicationLogSelect)
    .or(`user_id.eq.${user.id},patient_id.eq.${user.id}`)
    .order("injection_date", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map(mapGlp1MedicationLogRow);
}

export async function getLatestGlp1SideEffectForCurrentUser(): Promise<Glp1SideEffectLog | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("glp1_side_effect_logs")
    .select(glp1SideEffectLogSelect)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapGlp1SideEffectLogRow(data);
}

export async function getLatestGlp1SummaryForCurrentUser(): Promise<Glp1LatestSummary> {
  if (!hasSupabaseConfig()) {
    return emptyGlp1LatestSummary();
  }

  const [history, latestSideEffect] = await Promise.all([
    getGlp1HistoryForCurrentUser(1),
    getLatestGlp1SideEffectForCurrentUser(),
  ]);

  return buildGlp1LatestSummary(history[0] || null, latestSideEffect);
}

export async function getClinicGlp1Alerts(): Promise<ClinicGlp1AlertPatient[]> {
  if (!hasSupabaseConfig()) {
    return getDemoClinicGlp1Alerts();
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const [{ data: medicationRows }, { data: sideEffectRows }] = await Promise.all([
    supabase
      .from("glp1_medication_logs")
      .select(glp1MedicationLogSelect)
      .order("injection_date", { ascending: false })
      .limit(200),
    supabase
      .from("glp1_side_effect_logs")
      .select(glp1SideEffectLogSelect)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const latestMedicationByUser = new Map<string, Glp1MedicationLog>();
  const latestSideEffectByUser = new Map<string, Glp1SideEffectLog>();

  (medicationRows || []).forEach((row) => {
    const log = mapGlp1MedicationLogRow(row);
    if (log.userId && !latestMedicationByUser.has(log.userId)) {
      latestMedicationByUser.set(log.userId, log);
    }
  });

  (sideEffectRows || []).forEach((row) => {
    const log = mapGlp1SideEffectLogRow(row);
    if (log.userId && !latestSideEffectByUser.has(log.userId)) {
      latestSideEffectByUser.set(log.userId, log);
    }
  });

  const patientIds = Array.from(
    new Set([
      ...Array.from(latestMedicationByUser.keys()),
      ...Array.from(latestSideEffectByUser.keys()),
    ]),
  );

  if (patientIds.length === 0) {
    return [];
  }

  const { data: profileRows, error } = await supabase
    .from("profiles")
    .select("id,full_name,date_of_birth")
    .in("id", patientIds);

  if (error || !profileRows) {
    return [];
  }

  const engagementByPatient =
    await getClinicPatientEngagementOverviews(patientIds);

  return (profileRows as ProfileRow[]).map((profile) =>
    buildPatientAlert(
      profile,
      latestMedicationByUser.get(profile.id) || null,
      latestSideEffectByUser.get(profile.id) || null,
      engagementByPatient.get(profile.id),
    ),
  );
}
