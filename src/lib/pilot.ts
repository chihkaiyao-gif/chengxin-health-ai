import { getCurrentUser } from "@/lib/auth";
import { getClinicContext } from "@/lib/clinic-saas";
import { getDemoFeedbackItems } from "@/lib/feedback";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  ActivePilotEnrollment,
  FeedbackItem,
  PilotCohort,
  PilotCohortDetail,
  PilotCohortMember,
  PilotCohortMemberStatus,
  PilotCohortReport,
  PilotCohortStatus,
  PilotMemberMetrics,
} from "@/lib/types";
import type {
  PilotCohortCreateInput,
  PilotCohortMemberAddInput,
} from "@/lib/validation";

type PilotCohortRow = {
  id: string;
  clinic_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: PilotCohortStatus;
  goal: string | null;
  created_at: string;
};

type PilotMemberRow = {
  id: string;
  cohort_id: string;
  user_id: string;
  enrolled_at: string;
  status: PilotCohortMemberStatus;
  note: string | null;
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
};

type ActivePilotRow = {
  pilot_cohorts?: PilotCohortRow | PilotCohortRow[] | null;
};

const pilotCohortSelect =
  "id,clinic_id,name,start_date,end_date,status,goal,created_at";

const pilotMemberSelect =
  "id,cohort_id,user_id,enrolled_at,status,note,profiles:user_id(full_name)";

function firstOrNull<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function firstProfileName(
  value:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null
    | undefined,
) {
  return firstOrNull(value)?.full_name || null;
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

function startEndIso(cohort: PilotCohort) {
  return {
    startIso: `${cohort.startDate}T00:00:00.000Z`,
    endIso: `${cohort.endDate}T23:59:59.999Z`,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function rate(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function mapCohort(row: PilotCohortRow): PilotCohort {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    goal: row.goal,
    createdAt: row.created_at,
  };
}

function mapMember(row: PilotMemberRow): PilotCohortMember {
  return {
    id: row.id,
    cohortId: row.cohort_id,
    userId: row.user_id,
    patientName: firstProfileName(row.profiles),
    enrolledAt: row.enrolled_at,
    status: row.status,
    note: row.note,
  };
}

function canManagePilot(role: string) {
  return ["owner", "doctor", "clinic_staff", "super_admin"].includes(role);
}

function getDemoPilotCohort(): PilotCohort {
  return {
    id: "demo-pilot-14d",
    clinicId: "demo-clinic",
    name: "14 天 GLP-1 健康管理試用",
    startDate: daysAgo(6),
    endDate: addDays(daysAgo(6), 13),
    status: "active",
    goal: "觀察第一批 5 位病人在 14 天內的登入、飲食、用藥、副作用、AI Coach 與回饋情況。",
    createdAt: `${daysAgo(7)}T09:00:00.000Z`,
  };
}

function getDemoPilotMembers(): PilotMemberMetrics[] {
  const cohort = getDemoPilotCohort();
  const rows = [
    ["demo-1", "王小晴", 7, 86, 6, 4, 6, 1, false],
    ["demo-2", "陳美華", 5, 72, 5, 0, 4, 1, false],
    ["demo-3", "林建宇", 2, 34, 1, 2, 1, 0, true],
    ["demo-4", "張怡君", 6, 80, 5, 3, 5, 1, false],
    ["demo-5", "吳伯仁", 1, 22, 0, 0, 0, 0, true],
  ] as const;

  return rows.map(
    ([
      userId,
      patientName,
      loginDays,
      taskCompletionRate,
      foodLogDays,
      glp1LogCount,
      aiCoachUseCount,
      feedbackCount,
      lowEngagement,
    ]) => ({
      member: {
        id: `demo-pilot-member-${userId}`,
        cohortId: cohort.id,
        userId,
        patientName,
        enrolledAt: cohort.createdAt,
        status: lowEngagement ? "active" : "active",
        note: lowEngagement ? "需要診所關懷追蹤。" : null,
      },
      loginDays,
      taskCompletionRate,
      foodLogDays,
      glp1LogCount,
      aiCoachUseCount,
      feedbackCount,
      lowEngagement,
    }),
  );
}

function getDemoPilotFeedback(): FeedbackItem[] {
  const base = getDemoFeedbackItems();
  return [
    ...base,
    {
      id: "demo-feedback-pilot-3",
      userId: "demo-4",
      userName: "張怡君",
      clinicId: "demo-clinic",
      pagePath: "/dashboard",
      feedbackType: "praise",
      message: "每日任務很清楚，14 天試用時知道今天要先做什麼。",
      screenshotUrl: null,
      status: "open",
      createdAt: new Date().toISOString(),
    },
  ];
}

function buildFeedbackSummary(items: FeedbackItem[]) {
  if (items.length === 0) {
    return ["目前尚無 pilot 回饋。"];
  }

  const confusing = items.filter((item) => item.feedbackType === "confusing").length;
  const bugs = items.filter((item) => item.feedbackType === "bug").length;
  const ideas = items.filter((item) => item.feedbackType === "idea").length;
  const praise = items.filter((item) => item.feedbackType === "praise").length;
  const pageCounts = new Map<string, number>();

  items.forEach((item) => {
    pageCounts.set(item.pagePath, (pageCounts.get(item.pagePath) || 0) + 1);
  });

  const topPages = Array.from(pageCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([page, count]) => `${page} ${count} 則`);

  return [
    `共 ${items.length} 則回饋：問題 ${bugs}、困惑 ${confusing}、建議 ${ideas}、稱讚 ${praise}。`,
    topPages.length > 0 ? `最常被提到頁面：${topPages.join("、")}。` : "尚無集中頁面。",
    confusing > 0
      ? "有使用者回報看不懂，建議下一輪優先優化提示文字與下一步 CTA。"
      : "目前沒有明顯困惑回報。",
  ];
}

function buildReportFromDetail(detail: PilotCohortDetail): PilotCohortReport {
  const members = detail.members;
  const totalMembers = members.length;
  const activeMembers = members.filter(
    (item) =>
      item.member.status === "active" &&
      (item.loginDays > 0 ||
        item.taskCompletionRate > 0 ||
        item.foodLogDays > 0 ||
        item.aiCoachUseCount > 0),
  );
  const lowEngagementMembers = members
    .filter((item) => item.lowEngagement)
    .map((item) => ({
      userId: item.member.userId,
      patientName: item.member.patientName,
      reason:
        item.loginDays <= 2
          ? "登入天數偏低"
          : item.taskCompletionRate < 40
            ? "任務完成率偏低"
            : "近期互動偏低",
    }));

  return {
    cohort: detail.cohort,
    totalMembers,
    activeRate: rate(activeMembers.length, totalMembers),
    averageTaskCompletionRate: average(
      members.map((item) => item.taskCompletionRate),
    ),
    foodLoggingRate: rate(
      members.filter((item) => item.foodLogDays > 0).length,
      totalMembers,
    ),
    medicationLoggingRate: rate(
      members.filter((item) => item.glp1LogCount > 0).length,
      totalMembers,
    ),
    aiCoachUsageRate: rate(
      members.filter((item) => item.aiCoachUseCount > 0).length,
      totalMembers,
    ),
    averageFeedbackCount:
      totalMembers > 0
        ? Math.round(
            (members.reduce((total, item) => total + item.feedbackCount, 0) /
              totalMembers) *
              10,
          ) / 10
        : 0,
    lowEngagementMembers,
    commonFeedbackSummary: detail.feedbackSummary,
    generatedAt: new Date().toISOString(),
    persisted: detail.persisted,
  };
}

function getDemoPilotDetail(): PilotCohortDetail {
  const feedbackItems = getDemoPilotFeedback();

  return {
    cohort: getDemoPilotCohort(),
    members: getDemoPilotMembers(),
    feedbackItems,
    feedbackSummary: buildFeedbackSummary(feedbackItems),
    persisted: false,
  };
}

function metricForUser(
  member: PilotCohortMember,
  data: {
    loginDays: Map<string, number>;
    taskRates: Map<string, number>;
    foodLogDays: Map<string, number>;
    glp1Counts: Map<string, number>;
    aiCoachCounts: Map<string, number>;
    feedbackCounts: Map<string, number>;
  },
): PilotMemberMetrics {
  const loginDays = data.loginDays.get(member.userId) || 0;
  const taskCompletionRate = data.taskRates.get(member.userId) || 0;
  const foodLogDays = data.foodLogDays.get(member.userId) || 0;
  const glp1LogCount = data.glp1Counts.get(member.userId) || 0;
  const aiCoachUseCount = data.aiCoachCounts.get(member.userId) || 0;
  const feedbackCount = data.feedbackCounts.get(member.userId) || 0;

  return {
    member,
    loginDays,
    taskCompletionRate,
    foodLogDays,
    glp1LogCount,
    aiCoachUseCount,
    feedbackCount,
    lowEngagement: loginDays <= 2 || taskCompletionRate < 40,
  };
}

async function buildRealPilotDetail(cohort: PilotCohort, rows: PilotMemberRow[]) {
  const members = rows.map(mapMember);
  const userIds = members.map((member) => member.userId);
  const { startIso, endIso } = startEndIso(cohort);
  const loginDays = new Map<string, Set<string>>();
  const taskStats = new Map<string, { total: number; completed: number }>();
  const foodDays = new Map<string, Set<string>>();
  const glp1Counts = new Map<string, number>();
  const aiCoachCounts = new Map<string, number>();
  const feedbackCounts = new Map<string, number>();
  let feedbackItems: FeedbackItem[] = [];

  if (userIds.length === 0) {
    return {
      cohort,
      members: [],
      feedbackItems: [],
      feedbackSummary: buildFeedbackSummary([]),
      persisted: true,
    };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return null;
  }

  const [
    engagementResult,
    taskResult,
    foodResult,
    glp1Result,
    aiCoachResult,
    feedbackResult,
  ] = await Promise.all([
    supabase
      .from("engagement_metrics")
      .select("user_id,metric_date,login_count")
      .in("user_id", userIds)
      .gte("metric_date", cohort.startDate)
      .lte("metric_date", cohort.endDate),
    supabase
      .from("daily_tasks")
      .select("user_id,status,task_date")
      .in("user_id", userIds)
      .gte("task_date", cohort.startDate)
      .lte("task_date", cohort.endDate),
    supabase
      .from("food_logs")
      .select("user_id,eaten_at")
      .in("user_id", userIds)
      .gte("eaten_at", startIso)
      .lte("eaten_at", endIso),
    supabase
      .from("glp1_medication_logs")
      .select("user_id,injection_date")
      .in("user_id", userIds)
      .gte("injection_date", cohort.startDate)
      .lte("injection_date", cohort.endDate),
    supabase
      .from("ai_coach_insights")
      .select("user_id,insight_date")
      .in("user_id", userIds)
      .gte("insight_date", cohort.startDate)
      .lte("insight_date", cohort.endDate),
    supabase
      .from("feedback")
      .select(
        "id,user_id,clinic_id,page_path,feedback_type,message,screenshot_url,status,created_at,profiles:user_id(full_name)",
      )
      .eq("clinic_id", context.clinic.id)
      .in("user_id", userIds)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false }),
  ]);

  (engagementResult.data || []).forEach(
    (row: { user_id: string; metric_date: string; login_count: number | string | null }) => {
      if (Number(row.login_count || 0) <= 0) {
        return;
      }
      const set = loginDays.get(row.user_id) || new Set<string>();
      set.add(row.metric_date);
      loginDays.set(row.user_id, set);
    },
  );

  (taskResult.data || []).forEach(
    (row: { user_id: string; status: string | null }) => {
      const stat = taskStats.get(row.user_id) || { total: 0, completed: 0 };
      stat.total += 1;
      if (row.status === "completed") {
        stat.completed += 1;
      }
      taskStats.set(row.user_id, stat);
    },
  );

  (foodResult.data || []).forEach((row: { user_id: string; eaten_at: string | null }) => {
    const set = foodDays.get(row.user_id) || new Set<string>();
    if (row.eaten_at) {
      set.add(row.eaten_at.slice(0, 10));
    }
    foodDays.set(row.user_id, set);
  });

  (glp1Result.data || []).forEach((row: { user_id: string }) => {
    glp1Counts.set(row.user_id, (glp1Counts.get(row.user_id) || 0) + 1);
  });

  (aiCoachResult.data || []).forEach((row: { user_id: string }) => {
    aiCoachCounts.set(row.user_id, (aiCoachCounts.get(row.user_id) || 0) + 1);
  });

  feedbackItems = ((feedbackResult.data || []) as Array<{
    id: string;
    user_id: string;
    clinic_id: string | null;
    page_path: string;
    feedback_type: FeedbackItem["feedbackType"];
    message: string;
    screenshot_url: string | null;
    status: FeedbackItem["status"];
    created_at: string;
    profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
  }>).map((row) => {
    feedbackCounts.set(row.user_id, (feedbackCounts.get(row.user_id) || 0) + 1);

    return {
      id: row.id,
      userId: row.user_id,
      userName: firstProfileName(row.profiles),
      clinicId: row.clinic_id,
      pagePath: row.page_path,
      feedbackType: row.feedback_type,
      message: row.message,
      screenshotUrl: row.screenshot_url,
      status: row.status,
      createdAt: row.created_at,
    };
  });

  const metrics = members.map((member) =>
    metricForUser(member, {
      loginDays: new Map(
        Array.from(loginDays.entries()).map(([userId, values]) => [
          userId,
          values.size,
        ]),
      ),
      taskRates: new Map(
        members.map((item) => {
          const stat = taskStats.get(item.userId);
          return [
            item.userId,
            stat && stat.total > 0
              ? Math.round((stat.completed / stat.total) * 100)
              : 0,
          ];
        }),
      ),
      foodLogDays: new Map(
        Array.from(foodDays.entries()).map(([userId, values]) => [
          userId,
          values.size,
        ]),
      ),
      glp1Counts,
      aiCoachCounts,
      feedbackCounts,
    }),
  );

  return {
    cohort,
    members: metrics,
    feedbackItems,
    feedbackSummary: buildFeedbackSummary(feedbackItems),
    persisted: true,
  };
}

export async function getClinicPilotCohorts() {
  if (!hasSupabaseConfig()) {
    return { persisted: false, items: [getDemoPilotCohort()] };
  }

  const context = await getClinicContext();
  const { supabase } = await getCurrentUser();

  if (!supabase || !context) {
    return { persisted: true, items: [] };
  }

  const { data, error } = await supabase
    .from("pilot_cohorts")
    .select(pilotCohortSelect)
    .eq("clinic_id", context.clinic.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { persisted: true, items: [] };
  }

  return {
    persisted: true,
    items: (data as PilotCohortRow[]).map(mapCohort),
  };
}

export async function createPilotCohort(input: PilotCohortCreateInput) {
  if (!hasSupabaseConfig()) {
    return {
      persisted: false,
      cohort: {
        ...getDemoPilotCohort(),
        id: `demo-pilot-${crypto.randomUUID()}`,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        status: input.status,
        goal: input.goal || null,
        createdAt: new Date().toISOString(),
      },
    };
  }

  const context = await getClinicContext();
  const { supabase } = await getCurrentUser();

  if (!supabase || !context) {
    return { error: "UNAUTHENTICATED" as const };
  }

  if (!canManagePilot(context.member.role)) {
    return { error: "FORBIDDEN" as const };
  }

  const { data, error } = await supabase
    .from("pilot_cohorts")
    .insert({
      clinic_id: context.clinic.id,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
      goal: input.goal || null,
    })
    .select(pilotCohortSelect)
    .single<PilotCohortRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" as const, details: error?.message };
  }

  return { persisted: true, cohort: mapCohort(data) };
}

export async function addPilotCohortMember(
  cohortId: string,
  input: PilotCohortMemberAddInput,
) {
  if (!hasSupabaseConfig()) {
    return {
      persisted: false,
      member: {
        id: `demo-pilot-member-${crypto.randomUUID()}`,
        cohortId,
        userId: input.userId,
        patientName: input.userId,
        enrolledAt: new Date().toISOString(),
        status: "active" as const,
        note: input.note || null,
      },
    };
  }

  const context = await getClinicContext();
  const { supabase } = await getCurrentUser();

  if (!supabase || !context) {
    return { error: "UNAUTHENTICATED" as const };
  }

  if (!canManagePilot(context.member.role)) {
    return { error: "FORBIDDEN" as const };
  }

  const { data, error } = await supabase
    .from("pilot_cohort_members")
    .upsert(
      {
        cohort_id: cohortId,
        user_id: input.userId,
        status: "active",
        note: input.note || null,
      },
      { onConflict: "cohort_id,user_id" },
    )
    .select(pilotMemberSelect)
    .single<PilotMemberRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" as const, details: error?.message };
  }

  return { persisted: true, member: mapMember(data) };
}

export async function getPilotCohortDetail(
  cohortId: string,
): Promise<PilotCohortDetail | null> {
  if (!hasSupabaseConfig()) {
    return getDemoPilotDetail();
  }

  const context = await getClinicContext();
  const { supabase } = await getCurrentUser();

  if (!supabase || !context) {
    return null;
  }

  const { data: cohortRow, error: cohortError } = await supabase
    .from("pilot_cohorts")
    .select(pilotCohortSelect)
    .eq("id", cohortId)
    .eq("clinic_id", context.clinic.id)
    .maybeSingle<PilotCohortRow>();

  if (cohortError || !cohortRow) {
    return null;
  }

  const { data: memberRows, error: memberError } = await supabase
    .from("pilot_cohort_members")
    .select(pilotMemberSelect)
    .eq("cohort_id", cohortId)
    .order("enrolled_at", { ascending: true });

  if (memberError || !memberRows) {
    return {
      cohort: mapCohort(cohortRow),
      members: [],
      feedbackItems: [],
      feedbackSummary: buildFeedbackSummary([]),
      persisted: true,
    };
  }

  return buildRealPilotDetail(mapCohort(cohortRow), memberRows as PilotMemberRow[]);
}

export async function getPilotCohortReport(
  cohortId: string,
): Promise<PilotCohortReport | null> {
  const detail = await getPilotCohortDetail(cohortId);

  if (!detail) {
    return null;
  }

  return buildReportFromDetail(detail);
}

export async function getActivePilotForCurrentUser(): Promise<ActivePilotEnrollment | null> {
  if (!hasSupabaseConfig()) {
    const cohort = getDemoPilotCohort();

    return {
      cohortId: cohort.id,
      name: cohort.name,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      goal: cohort.goal,
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("pilot_cohort_members")
    .select(`pilot_cohorts:cohort_id(${pilotCohortSelect})`)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(5);

  if (error || !data) {
    return null;
  }

  const today = dateOnly();
  const cohort = (data as ActivePilotRow[])
    .map((row) => firstOrNull(row.pilot_cohorts))
    .find((item): item is PilotCohortRow => {
      if (!item) {
        return false;
      }

      return (
        item.status === "active" &&
        item.start_date <= today &&
        item.end_date >= today
      );
    });

  if (!cohort) {
    return null;
  }

  return {
    cohortId: cohort.id,
    name: cohort.name,
    startDate: cohort.start_date,
    endDate: cohort.end_date,
    goal: cohort.goal,
  };
}
