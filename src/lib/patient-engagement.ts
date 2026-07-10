import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  AssessmentPersona,
  Badge,
  BadgesSummary,
  DailyTask,
  DailyTaskPriority,
  DailyTaskType,
  PatientEngagementOverview,
  Streak,
  StreakType,
  TodayTasksSummary,
  UserBadge,
} from "@/lib/types";

export const dailyTaskSelect =
  "id,user_id,task_date,task_type,title,description,status,completed_at,created_at";

export const streakSelect =
  "id,user_id,streak_type,current_count,longest_count,last_completed_date,updated_at";

export const badgeSelect = "id,code,name,description,icon,criteria,active";

const dayMs = 86400000;

type DailyTaskRow = {
  id: string;
  user_id: string;
  task_date: string;
  task_type: DailyTaskType;
  title: string;
  description: string;
  status: DailyTask["status"];
  completed_at: string | null;
  created_at: string;
};

type StreakRow = {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_count: number | string | null;
  longest_count: number | string | null;
  last_completed_date: string | null;
  updated_at: string;
};

type BadgeRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria: Record<string, unknown> | null;
  active: boolean;
};

type UserBadgeRow = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badges?: BadgeRow | BadgeRow[] | null;
};

type TaskBlueprint = {
  taskType: DailyTaskType;
  title: string;
  description: string;
  href: string;
};

type TaskContext = {
  persona: AssessmentPersona | null;
  hasGlp1: boolean;
  inbodyStale: boolean;
  appointmentSuggested: boolean;
  completedTypes: Set<DailyTaskType>;
};

type CompletionRow = {
  task_date?: string | null;
  metric_date?: string | null;
  task_type?: DailyTaskType | null;
  login_count?: number | string | null;
  food_logged?: boolean | null;
  workout_logged?: boolean | null;
  weight_logged?: boolean | null;
  medication_logged?: boolean | null;
  inbody_uploaded?: boolean | null;
  status?: string | null;
};

const badgeCatalog: Badge[] = [
  {
    id: "badge-first-assessment",
    code: "first_assessment",
    name: "新手上路",
    description: "完成初始健康評估。",
    icon: "clipboard-check",
    criteria: { assessment_completed: true },
    active: true,
  },
  {
    id: "badge-seven-day-streak",
    code: "seven_day_streak",
    name: "連續7天",
    description: "連續紀錄 7 天。",
    icon: "flame",
    criteria: { daily_record_streak: 7 },
    active: true,
  },
  {
    id: "badge-protein-pro",
    code: "protein_pro",
    name: "蛋白質達人",
    description: "一週蛋白質達標 5 天。",
    icon: "egg",
    criteria: { protein_goal_days_7d: 5 },
    active: true,
  },
  {
    id: "badge-steady-mover",
    code: "steady_mover",
    name: "運動穩定者",
    description: "一週運動 3 次。",
    icon: "dumbbell",
    criteria: { workouts_7d: 3 },
    active: true,
  },
  {
    id: "badge-inbody-tracker",
    code: "inbody_tracker",
    name: "InBody追蹤者",
    description: "完成 2 次 InBody 紀錄。",
    icon: "scan-line",
    criteria: { inbody_count: 2 },
    active: true,
  },
  {
    id: "badge-visit-habit",
    code: "visit_habit",
    name: "回診好習慣",
    description: "完成預約回診。",
    icon: "calendar-check",
    criteria: { appointment_request: true },
    active: true,
  },
  {
    id: "badge-glp1-on-time",
    code: "glp1_on_time",
    name: "GLP-1準時王",
    description: "連續 4 週準時記錄 GLP-1。",
    icon: "syringe",
    criteria: { medication_on_time_streak: 4 },
    active: true,
  },
];

const taskHrefs: Record<DailyTaskType, string> = {
  weight_log: "/inbody",
  food_photo: "/nutrition",
  protein_goal: "/nutrition",
  hydration_goal: "/dashboard",
  workout: "/training",
  glp1_injection: "/medications",
  side_effect_report: "/medications",
  inbody_upload: "/inbody",
  appointment_request: "/appointments",
};

export function dateOnly(date = new Date()) {
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

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function dateDistanceFromToday(dateString: string | null | undefined) {
  if (!dateString) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date(`${dateOnly()}T00:00:00`);
  const date = new Date(`${dateString.slice(0, 10)}T00:00:00`);
  return Math.round((today.getTime() - date.getTime()) / dayMs);
}

function startEndForDate(taskDate: string) {
  const start = new Date(`${taskDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function taskPriority(
  taskType: DailyTaskType,
  persona: AssessmentPersona | null,
): DailyTaskPriority {
  if (
    persona === "glp1_weight_loss" &&
    (taskType === "glp1_injection" ||
      taskType === "side_effect_report" ||
      taskType === "protein_goal")
  ) {
    return "important";
  }

  if (
    (persona === "gym_training" || persona === "fitness_beginner") &&
    (taskType === "workout" || taskType === "protein_goal")
  ) {
    return "important";
  }

  if (
    persona === "senior_frailty" &&
    (taskType === "hydration_goal" ||
      taskType === "workout" ||
      taskType === "weight_log")
  ) {
    return "important";
  }

  if (
    persona === "chronic_disease" &&
    (taskType === "weight_log" || taskType === "hydration_goal")
  ) {
    return "important";
  }

  return "normal";
}

function mapDailyTaskRow(
  row: DailyTaskRow,
  persona: AssessmentPersona | null,
): DailyTask {
  return {
    id: row.id,
    userId: row.user_id,
    taskDate: row.task_date,
    taskType: row.task_type,
    title: row.title,
    description: row.description,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    priority: taskPriority(row.task_type, persona),
  };
}

function mapStreakRow(row: StreakRow): Streak {
  return {
    id: row.id,
    userId: row.user_id,
    streakType: row.streak_type,
    currentCount: toNumber(row.current_count),
    longestCount: toNumber(row.longest_count),
    lastCompletedDate: row.last_completed_date,
    updatedAt: row.updated_at,
  };
}

function mapBadgeRow(row: BadgeRow): Badge {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    icon: row.icon,
    criteria: row.criteria || {},
    active: row.active,
  };
}

function rowBadge(row: UserBadgeRow) {
  if (Array.isArray(row.badges)) {
    return row.badges[0] || null;
  }

  return row.badges || null;
}

function mapUserBadgeRow(row: UserBadgeRow): UserBadge | null {
  const badge = rowBadge(row);

  if (!badge) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    badgeId: row.badge_id,
    badge: mapBadgeRow(badge),
    earnedAt: row.earned_at,
  };
}

function buildSummary(
  taskDate: string,
  tasks: DailyTask[],
  persisted: boolean,
): TodayTasksSummary {
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const totalCount = tasks.length;
  const importantPendingCount = tasks.filter(
    (task) => task.priority === "important" && task.status !== "completed",
  ).length;

  return {
    taskDate,
    tasks,
    completedCount,
    totalCount,
    completionRate:
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    importantPendingCount,
    persisted,
  };
}

function buildTaskBlueprints(context: TaskContext): TaskBlueprint[] {
  const tasks: TaskBlueprint[] = [
    {
      taskType: "weight_log",
      title: "記錄體重",
      description: "今天量一次體重或更新體組成，幫助追蹤趨勢。",
      href: taskHrefs.weight_log,
    },
    {
      taskType: "food_photo",
      title: "拍一餐飲食",
      description: "拍下其中一餐，讓 AI 協助估算營養。",
      href: taskHrefs.food_photo,
    },
    {
      taskType: "protein_goal",
      title: "達成蛋白質目標",
      description: "以保留肌肉為主，先補足今天的蛋白質。",
      href: taskHrefs.protein_goal,
    },
    {
      taskType: "hydration_goal",
      title: "喝水達標",
      description: "分次補水，若有疾病限制請依醫師或營養師建議。",
      href: taskHrefs.hydration_goal,
    },
    {
      taskType: "workout",
      title: context.persona === "senior_frailty" ? "完成坐站或步行" : "完成今日運動",
      description:
        context.persona === "senior_frailty"
          ? "以坐站訓練、平衡或短時間步行為主，避免跌倒風險。"
          : "完成今天安排的低風險訓練，身體不適時先休息。",
      href: taskHrefs.workout,
    },
  ];

  if (context.hasGlp1 || context.persona === "glp1_weight_loss") {
    tasks.push(
      {
        taskType: "glp1_injection",
        title: "記錄 GLP-1 施打",
        description: "僅做紀錄與提醒；劑量與用藥請由醫師評估。",
        href: taskHrefs.glp1_injection,
      },
      {
        taskType: "side_effect_report",
        title: "回報副作用",
        description: "記錄噁心、嘔吐、腹痛或脫水感，方便回診溝通。",
        href: taskHrefs.side_effect_report,
      },
    );
  }

  if (context.inbodyStale) {
    tasks.push({
      taskType: "inbody_upload",
      title: "完成 InBody 上傳",
      description: "更新體脂、骨骼肌與內臟脂肪趨勢。",
      href: taskHrefs.inbody_upload,
    });
  }

  if (context.appointmentSuggested) {
    tasks.push({
      taskType: "appointment_request",
      title: "預約回診",
      description: "若有副作用偏高、用藥疑問或停滯，可提出回診需求。",
      href: taskHrefs.appointment_request,
    });
  }

  return tasks;
}

function demoTasks(): TodayTasksSummary {
  const taskDate = dateOnly();
  const now = new Date().toISOString();
  const completedTypes = new Set<DailyTaskType>([
    "food_photo",
    "protein_goal",
    "workout",
    "side_effect_report",
  ]);
  const context: TaskContext = {
    persona: "glp1_weight_loss",
    hasGlp1: true,
    inbodyStale: true,
    appointmentSuggested: true,
    completedTypes,
  };

  const tasks = buildTaskBlueprints(context).map((blueprint, index) => ({
    id: `demo-task-${blueprint.taskType}`,
    userId: "demo-user",
    taskDate,
    taskType: blueprint.taskType,
    title: blueprint.title,
    description: blueprint.description,
    status: completedTypes.has(blueprint.taskType) ? "completed" : "pending",
    completedAt: completedTypes.has(blueprint.taskType) ? now : null,
    createdAt: new Date(Date.now() - index * 60000).toISOString(),
    priority: taskPriority(blueprint.taskType, context.persona),
  })) satisfies DailyTask[];

  return buildSummary(taskDate, tasks, false);
}

function demoStreaks(): Streak[] {
  const now = new Date().toISOString();
  const taskDate = dateOnly();

  return [
    ["login", 9, 14],
    ["food", 6, 9],
    ["workout", 3, 5],
    ["medication_on_time", 4, 4],
    ["daily_record", 8, 11],
  ].map(([streakType, currentCount, longestCount]) => ({
    id: `demo-streak-${streakType}`,
    userId: "demo-user",
    streakType: streakType as StreakType,
    currentCount: Number(currentCount),
    longestCount: Number(longestCount),
    lastCompletedDate: taskDate,
    updatedAt: now,
  }));
}

function demoBadges(): BadgesSummary {
  const earnedCodes = new Set([
    "first_assessment",
    "seven_day_streak",
    "protein_pro",
    "steady_mover",
    "glp1_on_time",
  ]);
  const earned = badgeCatalog
    .filter((badge) => earnedCodes.has(badge.code))
    .map((badge, index) => ({
      id: `demo-user-badge-${badge.code}`,
      userId: "demo-user",
      badgeId: badge.id,
      badge,
      earnedAt: new Date(Date.now() - index * dayMs).toISOString(),
    }));

  return {
    earned,
    available: badgeCatalog,
    earnedCount: earned.length,
    totalCount: badgeCatalog.length,
    persisted: false,
  };
}

async function getLatestPersona(supabase: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>["supabase"]>, userId: string) {
  const { data } = await supabase
    .from("assessment_results")
    .select("persona")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ persona: AssessmentPersona | null }>();

  return data?.persona || null;
}

async function getTaskContext(
  supabase: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>["supabase"]>,
  userId: string,
  taskDate: string,
): Promise<TaskContext> {
  const { startIso, endIso } = startEndForDate(taskDate);

  const [
    persona,
    foodResult,
    trainingResult,
    inbodyTodayResult,
    latestInbodyResult,
    glp1TodayResult,
    latestGlp1Result,
    sideEffectTodayResult,
    appointmentResult,
  ] = await Promise.all([
    getLatestPersona(supabase, userId),
    supabase
      .from("food_logs")
      .select("protein_g,eaten_at")
      .eq("user_id", userId)
      .gte("eaten_at", startIso)
      .lt("eaten_at", endIso),
    supabase
      .from("training_logs")
      .select("id")
      .eq("patient_id", userId)
      .eq("trained_on", taskDate),
    supabase
      .from("inbody_records")
      .select("id")
      .eq("user_id", userId)
      .gte("measured_at", startIso)
      .lt("measured_at", endIso),
    supabase
      .from("inbody_records")
      .select("measured_at")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ measured_at: string | null }>(),
    supabase
      .from("glp1_medication_logs")
      .select("id")
      .or(`user_id.eq.${userId},patient_id.eq.${userId}`)
      .eq("injection_date", taskDate),
    supabase
      .from("glp1_medication_logs")
      .select("id")
      .or(`user_id.eq.${userId},patient_id.eq.${userId}`)
      .order("injection_date", { ascending: false })
      .limit(1),
    supabase
      .from("glp1_side_effect_logs")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("appointments")
      .select("id,status,created_at")
      .eq("user_id", userId)
      .in("status", ["pending", "confirmed"])
      .limit(5),
  ]);

  const proteinG = (foodResult.data || []).reduce(
    (total, row) => total + toNumber(row.protein_g),
    0,
  );
  const completedTypes = new Set<DailyTaskType>();

  if ((foodResult.data || []).length > 0) {
    completedTypes.add("food_photo");
  }

  if (proteinG >= 90) {
    completedTypes.add("protein_goal");
  }

  if ((trainingResult.data || []).length > 0) {
    completedTypes.add("workout");
  }

  if ((inbodyTodayResult.data || []).length > 0) {
    completedTypes.add("weight_log");
    completedTypes.add("inbody_upload");
  }

  if ((glp1TodayResult.data || []).length > 0) {
    completedTypes.add("glp1_injection");
  }

  if ((sideEffectTodayResult.data || []).length > 0) {
    completedTypes.add("side_effect_report");
  }

  if ((appointmentResult.data || []).length > 0) {
    completedTypes.add("appointment_request");
  }

  const inbodyStale =
    !latestInbodyResult.data?.measured_at ||
    dateDistanceFromToday(latestInbodyResult.data.measured_at) > 30;

  return {
    persona,
    hasGlp1: (latestGlp1Result.data || []).length > 0,
    inbodyStale,
    appointmentSuggested:
      persona === "high_risk_medical_review" ||
      (persona === "glp1_weight_loss" && (latestGlp1Result.data || []).length > 0),
    completedTypes,
  };
}

export async function getTodayTasksForCurrentUser(): Promise<TodayTasksSummary> {
  if (!hasSupabaseConfig()) {
    return demoTasks();
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return buildSummary(dateOnly(), [], true);
  }

  return ensureTodayTasksForUser(supabase, user.id);
}

async function ensureTodayTasksForUser(
  supabase: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>["supabase"]>,
  userId: string,
) {
  const taskDate = dateOnly();
  const context = await getTaskContext(supabase, userId, taskDate);
  const blueprints = buildTaskBlueprints(context);
  const { data: existingRows } = await supabase
    .from("daily_tasks")
    .select(dailyTaskSelect)
    .eq("user_id", userId)
    .eq("task_date", taskDate);

  const existingByType = new Map(
    ((existingRows || []) as DailyTaskRow[]).map((row) => [row.task_type, row]),
  );
  const now = new Date().toISOString();
  const missingRows = blueprints
    .filter((blueprint) => !existingByType.has(blueprint.taskType))
    .map((blueprint) => ({
      user_id: userId,
      task_date: taskDate,
      task_type: blueprint.taskType,
      title: blueprint.title,
      description: blueprint.description,
      status: context.completedTypes.has(blueprint.taskType)
        ? "completed"
        : "pending",
      completed_at: context.completedTypes.has(blueprint.taskType) ? now : null,
    }));

  if (missingRows.length > 0) {
    await supabase.from("daily_tasks").upsert(missingRows, {
      onConflict: "user_id,task_date,task_type",
      ignoreDuplicates: true,
    });
  }

  const completedExistingIds = ((existingRows || []) as DailyTaskRow[])
    .filter(
      (row) =>
        row.status !== "completed" && context.completedTypes.has(row.task_type),
    )
    .map((row) => row.id);

  if (completedExistingIds.length > 0) {
    await supabase
      .from("daily_tasks")
      .update({ status: "completed", completed_at: now })
      .eq("user_id", userId)
      .in("id", completedExistingIds);
  }

  const { data: rows } = await supabase
    .from("daily_tasks")
    .select(dailyTaskSelect)
    .eq("user_id", userId)
    .eq("task_date", taskDate)
    .order("created_at", { ascending: true });

  const tasks = ((rows || []) as DailyTaskRow[])
    .filter((row) => blueprints.some((item) => item.taskType === row.task_type))
    .map((row) => mapDailyTaskRow(row, context.persona))
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === "important" ? -1 : 1;
      }

      return a.createdAt.localeCompare(b.createdAt);
    });

  return buildSummary(taskDate, tasks, true);
}

export async function completeTaskForCurrentUser(taskId: string) {
  if (!hasSupabaseConfig()) {
    const task = demoTasks().tasks.find((item) => item.id === taskId);

    return {
      persisted: false,
      task: task
        ? { ...task, status: "completed" as const, completedAt: new Date().toISOString() }
        : null,
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return { error: "UNAUTHENTICATED" as const };
  }

  const { data, error } = await supabase
    .from("daily_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select(dailyTaskSelect)
    .maybeSingle<DailyTaskRow>();

  if (error) {
    return { error: "SERVER_ERROR" as const, details: error.message };
  }

  if (!data) {
    return { error: "NOT_FOUND" as const };
  }

  await recalculateEngagementForUser(supabase, user.id);

  return {
    persisted: true,
    task: mapDailyTaskRow(data, await getLatestPersona(supabase, user.id)),
  };
}

function calculateDateStreak(dates: Set<string>) {
  let currentCount = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    if (!dates.has(daysAgo(offset))) {
      break;
    }

    currentCount += 1;
  }

  const sortedDates = Array.from(dates).sort();
  let longestCount = 0;
  let runningCount = 0;
  let previousDate: string | null = null;

  sortedDates.forEach((item) => {
    runningCount =
      previousDate && addDays(previousDate, 1) === item
        ? runningCount + 1
        : 1;
    longestCount = Math.max(longestCount, runningCount);
    previousDate = item;
  });

  return {
    currentCount,
    longestCount,
    lastCompletedDate: sortedDates[sortedDates.length - 1] || null,
  };
}

function calculateMedicationStreak(injectionDates: string[]) {
  const sorted = Array.from(new Set(injectionDates.map((item) => item.slice(0, 10))))
    .sort()
    .reverse();

  if (sorted.length === 0) {
    return { currentCount: 0, longestCount: 0, lastCompletedDate: null };
  }

  let currentCount = dateDistanceFromToday(sorted[0]) <= 8 ? 1 : 0;

  for (let index = 1; index < sorted.length && currentCount > 0; index += 1) {
    const current = new Date(`${sorted[index - 1]}T00:00:00`);
    const previous = new Date(`${sorted[index]}T00:00:00`);
    const gap = Math.round((current.getTime() - previous.getTime()) / dayMs);

    if (gap >= 5 && gap <= 9) {
      currentCount += 1;
    } else {
      break;
    }
  }

  let longestCount = currentCount;
  let running = sorted.length > 0 ? 1 : 0;

  for (let index = 1; index < sorted.length; index += 1) {
    const current = new Date(`${sorted[index - 1]}T00:00:00`);
    const previous = new Date(`${sorted[index]}T00:00:00`);
    const gap = Math.round((current.getTime() - previous.getTime()) / dayMs);
    running = gap >= 5 && gap <= 9 ? running + 1 : 1;
    longestCount = Math.max(longestCount, running);
  }

  return {
    currentCount,
    longestCount,
    lastCompletedDate: sorted[0] || null,
  };
}

function buildStreakPayload(
  userId: string,
  streakType: StreakType,
  value: {
    currentCount: number;
    longestCount: number;
    lastCompletedDate: string | null;
  },
) {
  return {
    user_id: userId,
    streak_type: streakType,
    current_count: value.currentCount,
    longest_count: value.longestCount,
    last_completed_date: value.lastCompletedDate,
    updated_at: new Date().toISOString(),
  };
}

async function recalculateEngagementForUser(
  supabase: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>["supabase"]>,
  userId: string,
) {
  const since = daysAgo(89);
  const [
    taskResult,
    metricResult,
    glp1Result,
    assessmentResult,
    inbodyResult,
    appointmentResult,
  ] = await Promise.all([
    supabase
      .from("daily_tasks")
      .select("task_date,task_type,status")
      .eq("user_id", userId)
      .gte("task_date", since),
    supabase
      .from("engagement_metrics")
      .select(
        "metric_date,login_count,food_logged,workout_logged,weight_logged,medication_logged,inbody_uploaded",
      )
      .eq("user_id", userId)
      .gte("metric_date", since),
    supabase
      .from("glp1_medication_logs")
      .select("injection_date")
      .or(`user_id.eq.${userId},patient_id.eq.${userId}`)
      .order("injection_date", { ascending: false })
      .limit(20),
    supabase
      .from("assessment_results")
      .select("id")
      .eq("user_id", userId)
      .limit(1),
    supabase
      .from("inbody_records")
      .select("id")
      .eq("user_id", userId)
      .limit(3),
    supabase
      .from("appointments")
      .select("id")
      .eq("user_id", userId)
      .limit(3),
  ]);

  const completedTasks = ((taskResult.data || []) as CompletionRow[]).filter(
    (row) => row.status === "completed" && row.task_date,
  );
  const metrics = (metricResult.data || []) as CompletionRow[];
  const loginDates = new Set<string>();
  const foodDates = new Set<string>();
  const workoutDates = new Set<string>();
  const dailyRecordDates = new Set<string>();
  const proteinGoalDates7d = new Set<string>();
  const workoutDates7d = new Set<string>();

  metrics.forEach((metric) => {
    if (!metric.metric_date) {
      return;
    }

    if (toNumber(metric.login_count) > 0) {
      loginDates.add(metric.metric_date);
    }

    if (metric.food_logged) {
      foodDates.add(metric.metric_date);
      dailyRecordDates.add(metric.metric_date);
    }

    if (metric.workout_logged) {
      workoutDates.add(metric.metric_date);
      dailyRecordDates.add(metric.metric_date);
    }

    if (
      metric.weight_logged ||
      metric.medication_logged ||
      metric.inbody_uploaded
    ) {
      dailyRecordDates.add(metric.metric_date);
    }
  });

  completedTasks.forEach((task) => {
    if (!task.task_date || !task.task_type) {
      return;
    }

    dailyRecordDates.add(task.task_date);

    if (task.task_type === "food_photo") {
      foodDates.add(task.task_date);
    }

    if (task.task_type === "workout") {
      workoutDates.add(task.task_date);
      if (task.task_date >= daysAgo(6)) {
        workoutDates7d.add(task.task_date);
      }
    }

    if (task.task_type === "protein_goal" && task.task_date >= daysAgo(6)) {
      proteinGoalDates7d.add(task.task_date);
    }
  });

  loginDates.add(dateOnly());

  const medicationStreak = calculateMedicationStreak(
    ((glp1Result.data || []) as Array<{ injection_date: string | null }>)
      .map((row) => row.injection_date)
      .filter(Boolean) as string[],
  );
  const streakPayload = [
    buildStreakPayload(userId, "login", calculateDateStreak(loginDates)),
    buildStreakPayload(userId, "food", calculateDateStreak(foodDates)),
    buildStreakPayload(userId, "workout", calculateDateStreak(workoutDates)),
    buildStreakPayload(userId, "daily_record", calculateDateStreak(dailyRecordDates)),
    buildStreakPayload(userId, "medication_on_time", medicationStreak),
  ];

  await supabase.from("streaks").upsert(streakPayload, {
    onConflict: "user_id,streak_type",
  });

  const earnedCodes = new Set<string>();
  const dailyRecordStreak = streakPayload.find(
    (item) => item.streak_type === "daily_record",
  )?.current_count;

  if ((assessmentResult.data || []).length > 0) {
    earnedCodes.add("first_assessment");
  }

  if ((dailyRecordStreak || 0) >= 7) {
    earnedCodes.add("seven_day_streak");
  }

  if (proteinGoalDates7d.size >= 5) {
    earnedCodes.add("protein_pro");
  }

  if (workoutDates7d.size >= 3) {
    earnedCodes.add("steady_mover");
  }

  if ((inbodyResult.data || []).length >= 2) {
    earnedCodes.add("inbody_tracker");
  }

  if ((appointmentResult.data || []).length > 0) {
    earnedCodes.add("visit_habit");
  }

  if (medicationStreak.currentCount >= 4) {
    earnedCodes.add("glp1_on_time");
  }

  if (earnedCodes.size > 0) {
    const { data: badges } = await supabase
      .from("badges")
      .select("id,code")
      .in("code", Array.from(earnedCodes));

    const userBadges = ((badges || []) as Array<{ id: string; code: string }>).map(
      (badge) => ({
        user_id: userId,
        badge_id: badge.id,
      }),
    );

    if (userBadges.length > 0) {
      await supabase.from("user_badges").upsert(userBadges, {
        onConflict: "user_id,badge_id",
        ignoreDuplicates: true,
      });
    }
  }
}

export async function recalculateEngagementForCurrentUser() {
  if (!hasSupabaseConfig()) {
    return {
      persisted: false,
      tasks: demoTasks(),
      streaks: demoStreaks(),
      badges: demoBadges(),
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return { error: "UNAUTHENTICATED" as const };
  }

  const tasks = await ensureTodayTasksForUser(supabase, user.id);
  await recalculateEngagementForUser(supabase, user.id);

  return {
    persisted: true,
    tasks,
    streaks: await getStreaksForCurrentUser(),
    badges: await getBadgesForCurrentUser(),
  };
}

export async function getStreaksForCurrentUser(): Promise<Streak[]> {
  if (!hasSupabaseConfig()) {
    return demoStreaks();
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const { data } = await supabase
    .from("streaks")
    .select(streakSelect)
    .eq("user_id", user.id)
    .order("streak_type", { ascending: true });

  return ((data || []) as StreakRow[]).map(mapStreakRow);
}

export async function getBadgesForCurrentUser(): Promise<BadgesSummary> {
  if (!hasSupabaseConfig()) {
    return demoBadges();
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return {
      earned: [],
      available: [],
      earnedCount: 0,
      totalCount: 0,
      persisted: true,
    };
  }

  const [badgesResult, earnedResult] = await Promise.all([
    supabase
      .from("badges")
      .select(badgeSelect)
      .eq("active", true)
      .order("code", { ascending: true }),
    supabase
      .from("user_badges")
      .select(`id,user_id,badge_id,earned_at,badges:badge_id(${badgeSelect})`)
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false }),
  ]);

  const available = ((badgesResult.data || []) as BadgeRow[]).map(mapBadgeRow);
  const earned = ((earnedResult.data || []) as UserBadgeRow[])
    .map(mapUserBadgeRow)
    .filter((item): item is UserBadge => Boolean(item));

  return {
    earned,
    available,
    earnedCount: earned.length,
    totalCount: available.length,
    persisted: true,
  };
}

export async function getClinicPatientEngagementOverviews(patientIds: string[]) {
  const overview = new Map<string, PatientEngagementOverview>();

  if (patientIds.length === 0) {
    return overview;
  }

  if (!hasSupabaseConfig()) {
    patientIds.forEach((patientId, index) => {
      overview.set(patientId, {
        consecutiveLoginDays: Math.max(0, 9 - index * 3),
        todayTaskCompletionRate: Math.max(20, 86 - index * 18),
        lowEngagementAlert: index >= 2,
        recentBadgeName:
          index === 0 ? "GLP-1準時王" : index === 1 ? "InBody追蹤者" : null,
        recentBadgeIcon: index === 0 ? "syringe" : index === 1 ? "scan-line" : null,
      });
    });

    return overview;
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return overview;
  }

  const [streakResult, taskResult, badgeResult] = await Promise.all([
    supabase
      .from("streaks")
      .select(streakSelect)
      .in("user_id", patientIds)
      .eq("streak_type", "login"),
    supabase
      .from("daily_tasks")
      .select("user_id,status")
      .in("user_id", patientIds)
      .eq("task_date", dateOnly()),
    supabase
      .from("user_badges")
      .select(`id,user_id,badge_id,earned_at,badges:badge_id(${badgeSelect})`)
      .in("user_id", patientIds)
      .order("earned_at", { ascending: false })
      .limit(200),
  ]);

  const loginByUser = new Map(
    ((streakResult.data || []) as StreakRow[]).map((row) => [
      row.user_id,
      mapStreakRow(row),
    ]),
  );
  const taskStats = new Map<string, { total: number; completed: number }>();

  ((taskResult.data || []) as Array<{ user_id: string; status: string }>).forEach(
    (row) => {
      const stat = taskStats.get(row.user_id) || { total: 0, completed: 0 };
      stat.total += 1;
      if (row.status === "completed") {
        stat.completed += 1;
      }
      taskStats.set(row.user_id, stat);
    },
  );

  const recentBadgeByUser = new Map<string, UserBadge>();
  ((badgeResult.data || []) as UserBadgeRow[]).forEach((row) => {
    const badge = mapUserBadgeRow(row);
    if (badge && !recentBadgeByUser.has(badge.userId)) {
      recentBadgeByUser.set(badge.userId, badge);
    }
  });

  patientIds.forEach((patientId) => {
    const login = loginByUser.get(patientId);
    const stats = taskStats.get(patientId);
    const badge = recentBadgeByUser.get(patientId);
    const loginDays = login?.currentCount || 0;
    const daysSinceLogin = dateDistanceFromToday(login?.lastCompletedDate);

    overview.set(patientId, {
      consecutiveLoginDays: loginDays,
      todayTaskCompletionRate:
        stats && stats.total > 0
          ? Math.round((stats.completed / stats.total) * 100)
          : 0,
      lowEngagementAlert: daysSinceLogin >= 7,
      recentBadgeName: badge?.badge.name || null,
      recentBadgeIcon: badge?.badge.icon || null,
    });
  });

  return overview;
}
