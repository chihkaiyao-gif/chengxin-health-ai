import { getCurrentUser } from "@/lib/auth";
import { getCurrentPatientEngagementSummary } from "@/lib/clinic-patient";
import {
  daysUntilDate,
  glp1SevereSymptomNotice,
} from "@/lib/glp1";
import {
  getClinicGlp1Alerts,
  getLatestGlp1SummaryForCurrentUser,
} from "@/lib/glp1-data";
import { getLatestInBodySummaryForCurrentUser } from "@/lib/inbody-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  Glp1LatestSummary,
  InBodyLatestSummary,
  PatientReminderCenter,
  ReminderEvent,
  ReminderSeverity,
  ReminderStatus,
} from "@/lib/types";

export const reminderEventSelect =
  "id,user_id,clinic_id,reminder_type,severity,title,message,status,source,created_at,resolved_at";

const clinicianReviewNotice = "請由醫師或診所人員評估。";

type ReminderEventRow = {
  id: string;
  user_id: string;
  clinic_id: string | null;
  reminder_type: string;
  severity: ReminderSeverity;
  title: string;
  message: string;
  status: ReminderStatus;
  source: string;
  created_at: string;
  resolved_at: string | null;
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
};

function profileName(
  profile:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null
    | undefined,
) {
  if (Array.isArray(profile)) {
    return profile[0]?.full_name || null;
  }

  return profile?.full_name || null;
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

function makeReminder(input: {
  id: string;
  userId: string;
  clinicId?: string | null;
  patientName?: string | null;
  reminderType: string;
  severity: ReminderSeverity;
  title: string;
  message: string;
  source: string;
  createdAt?: string;
  status?: ReminderStatus;
}): ReminderEvent {
  return {
    id: input.id,
    userId: input.userId,
    clinicId: input.clinicId || null,
    patientName: input.patientName || null,
    reminderType: input.reminderType,
    severity: input.severity,
    title: input.title,
    message: input.message,
    status: input.status || "open",
    source: input.source,
    createdAt: input.createdAt || new Date().toISOString(),
    resolvedAt: null,
  };
}

export function mapReminderEventRow(row: ReminderEventRow): ReminderEvent {
  return {
    id: row.id,
    userId: row.user_id,
    clinicId: row.clinic_id,
    patientName: profileName(row.profiles),
    reminderType: row.reminder_type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function buildGlp1Reminders(
  userId: string,
  summary: Glp1LatestSummary,
  patientName?: string | null,
): ReminderEvent[] {
  const reminders: ReminderEvent[] = [];
  const latestLog = summary.latestMedicationLog;

  if (latestLog && summary.nextInjectionDueSoon) {
    reminders.push(
      makeReminder({
        id: `generated-glp1-due-${userId}`,
        userId,
        patientName,
        reminderType: "glp1_next_injection_due_soon",
        severity: "medium",
        title: "GLP-1 下次施打日接近",
        message: `預計施打日 ${latestLog.nextInjectionDate}，距離下次施打 ${daysUntilDate(
          latestLog.nextInjectionDate,
        )} 天。${clinicianReviewNotice}`,
        source: "smart_rule:glp1_due_soon",
      }),
    );
  }

  if (summary.highSideEffectAlert) {
    reminders.push(
      makeReminder({
        id: `generated-high-side-effect-${userId}`,
        userId,
        patientName,
        reminderType: "high_side_effect_alert",
        severity: "high",
        title: "副作用偏高，建議回診討論",
        message: `系統偵測到副作用分數偏高或嘔吐、脫水疑慮。${clinicianReviewNotice} 若出現嚴重症狀，請立即就醫或聯絡醫療人員。`,
        source: "smart_rule:high_side_effect_alert",
      }),
    );
  }

  return reminders;
}

function buildInBodyReminders(
  userId: string,
  summary: InBodyLatestSummary,
): ReminderEvent[] {
  const reminders: ReminderEvent[] = [];
  const latest = summary.latest;
  const previous = summary.previous;
  const daysSinceInBody = daysSinceIso(latest?.measuredAt);

  if (daysSinceInBody === null || daysSinceInBody > 30) {
    reminders.push(
      makeReminder({
        id: `generated-inbody-stale-${userId}`,
        userId,
        reminderType: "inbody_stale_30d",
        severity: "low",
        title: "InBody 超過 30 天未更新",
        message:
          "建議更新 InBody 或體組成資料，方便趨勢追蹤與回診溝通。AI 讀取結果僅供記錄與趨勢追蹤。",
        source: "smart_rule:inbody_stale_30d",
      }),
    );
  }

  if (
    latest?.weightKg !== null &&
    latest?.weightKg !== undefined &&
    previous?.weightKg !== null &&
    previous?.weightKg !== undefined &&
    latest.weightKg >= previous.weightKg
  ) {
    reminders.push(
      makeReminder({
        id: `generated-weight-stall-${userId}`,
        userId,
        reminderType: "weight_stall_14d",
        severity: "medium",
        title: "體重停滯提醒",
        message: `近期體重未下降，建議回診時一起檢視飲食、運動與用藥紀錄。${clinicianReviewNotice}`,
        source: "smart_rule:weight_stall_14d",
      }),
    );
  }

  return reminders;
}

function getDemoPatientReminders(): ReminderEvent[] {
  return [
    makeReminder({
      id: "demo-reminder-glp1",
      userId: "demo-1",
      clinicId: "demo-clinic",
      patientName: "王小明",
      reminderType: "glp1_next_injection_due_soon",
      severity: "medium",
      title: "GLP-1 下次施打日接近",
      message: `下次施打日小於 1 天，請確認藥物與回診安排。${clinicianReviewNotice}`,
      source: "demo:smart_rule",
    }),
    makeReminder({
      id: "demo-reminder-side-effect",
      userId: "demo-1",
      clinicId: "demo-clinic",
      patientName: "王小明",
      reminderType: "high_side_effect_alert",
      severity: "high",
      title: "副作用偏高，建議回診討論",
      message: `噁心分數偏高。${clinicianReviewNotice} 若出現嚴重症狀，請立即就醫或聯絡醫療人員。`,
      source: "demo:smart_rule",
    }),
    makeReminder({
      id: "demo-reminder-inbody",
      userId: "demo-1",
      clinicId: "demo-clinic",
      patientName: "王小明",
      reminderType: "inbody_stale_30d",
      severity: "low",
      title: "InBody 超過 30 天未更新",
      message: "可提醒病人下次回診帶 InBody 或更新體組成照片。",
      source: "demo:smart_rule",
    }),
  ];
}

async function buildGeneratedPatientReminders(userId: string) {
  const [glp1Summary, inbodySummary, engagement] = await Promise.all([
    getLatestGlp1SummaryForCurrentUser(),
    getLatestInBodySummaryForCurrentUser(),
    getCurrentPatientEngagementSummary(),
  ]);

  const reminders = [
    ...buildGlp1Reminders(userId, glp1Summary),
    ...buildInBodyReminders(userId, inbodySummary),
  ];

  if (engagement.lowEngagementAlert) {
    reminders.push(
      makeReminder({
        id: `generated-low-engagement-${userId}`,
        userId,
        reminderType: "low_engagement_7d",
        severity: "medium",
        title: "7 天未登入提醒",
        message: `近期登入不足，建議安排關懷追蹤。${clinicianReviewNotice}`,
        source: "smart_rule:low_engagement_7d",
      }),
    );
  }

  if (engagement.foodMissingAlert) {
    reminders.push(
      makeReminder({
        id: `generated-food-missing-${userId}`,
        userId,
        reminderType: "food_missing_3d",
        severity: "medium",
        title: "3 天未記錄飲食",
        message: `飲食紀錄中斷，建議補記或回診時討論。${clinicianReviewNotice}`,
        source: "smart_rule:food_missing_3d",
      }),
    );
  }

  return reminders;
}

function mergeReminderEvents(
  persisted: ReminderEvent[],
  generated: ReminderEvent[],
) {
  const byType = new Map<string, ReminderEvent>();

  [...generated, ...persisted].forEach((event) => {
    if (!byType.has(event.reminderType)) {
      byType.set(event.reminderType, event);
    }
  });

  return Array.from(byType.values()).sort((a, b) => {
    const severityScore = { high: 3, medium: 2, low: 1 };
    return (
      severityScore[b.severity] - severityScore[a.severity] ||
      b.createdAt.localeCompare(a.createdAt)
    );
  });
}

export async function getReminderEventsForCurrentUser(): Promise<ReminderEvent[]> {
  if (!hasSupabaseConfig()) {
    return getDemoPatientReminders();
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const [{ data }, generated] = await Promise.all([
    supabase
      .from("reminder_events")
      .select(reminderEventSelect)
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    buildGeneratedPatientReminders(user.id),
  ]);

  const persisted = data ? (data as ReminderEventRow[]).map(mapReminderEventRow) : [];
  return mergeReminderEvents(persisted, generated);
}

export async function getPatientReminderCenter(): Promise<PatientReminderCenter> {
  const reminders = await getReminderEventsForCurrentUser();
  const openReminders = reminders.filter((reminder) => reminder.status === "open");
  const visitSuggestions = openReminders.filter(
    (reminder) =>
      reminder.severity === "high" ||
      reminder.reminderType.includes("glp1") ||
      reminder.reminderType.includes("side_effect") ||
      reminder.reminderType.includes("weight_stall"),
  );

  return {
    todayReminders: openReminders.slice(0, 5),
    visitSuggestions,
    incompleteItems: openReminders
      .filter((reminder) =>
        ["food_missing_3d", "inbody_stale_30d", "low_engagement_7d"].includes(
          reminder.reminderType,
        ),
      )
      .map((reminder) => reminder.title),
  };
}

export async function getClinicReminderEvents(): Promise<ReminderEvent[]> {
  if (!hasSupabaseConfig()) {
    return getDemoPatientReminders();
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const [{ data }, glp1Patients] = await Promise.all([
    supabase
      .from("reminder_events")
      .select(`${reminderEventSelect},profiles:user_id(full_name)`)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(100),
    getClinicGlp1Alerts(),
  ]);

  const persisted = data ? (data as ReminderEventRow[]).map(mapReminderEventRow) : [];
  const generated = glp1Patients.flatMap((patient) => {
    const summary: Glp1LatestSummary = {
      latestMedicationLog: patient.latestGlp1Log,
      latestSideEffectLog: patient.latestSideEffectLog,
      daysUntilNextInjection: patient.nextInjectionDate
        ? daysUntilDate(patient.nextInjectionDate)
        : null,
      nextInjectionDueSoon: patient.nextInjectionDueSoon,
      highSideEffectAlert: patient.highSideEffectAlert,
      safetyNotice: clinicianReviewNotice,
      severeSymptomNotice: glp1SevereSymptomNotice,
    };

    return buildGlp1Reminders(patient.id, summary, patient.fullName);
  });

  return mergeReminderEvents(persisted, generated);
}

export { clinicianReviewNotice };
