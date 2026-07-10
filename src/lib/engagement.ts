import type { EngagementMetric, EngagementSummary } from "@/lib/types";

export const engagementMetricSelect =
  "id,user_id,metric_date,login_count,food_logged,workout_logged,weight_logged,medication_logged,inbody_uploaded,adherence_score,created_at";

type EngagementMetricRow = {
  id: string;
  user_id: string;
  metric_date: string;
  login_count: number | string | null;
  food_logged: boolean | null;
  workout_logged: boolean | null;
  weight_logged: boolean | null;
  medication_logged: boolean | null;
  inbody_uploaded: boolean | null;
  adherence_score: number | string | null;
  created_at: string;
};

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function parseDateOnly(dateString: string) {
  const [year, month, day] = dateString.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateOnly(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return dateOnly(date);
}

function daysSince(dateString: string | null) {
  if (!dateString) {
    return null;
  }

  const target = parseDateOnly(dateString);
  const today = parseDateOnly(dateOnly());
  return Math.max(
    0,
    Math.round((today.getTime() - target.getTime()) / 86400000),
  );
}

function metricCompletedCount(metric: EngagementMetric) {
  return [
    metric.foodLogged,
    metric.workoutLogged,
    metric.weightLogged,
    metric.medicationLogged,
    metric.inbodyUploaded,
  ].filter(Boolean).length;
}

function completionRate(metrics: EngagementMetric[], days: 7 | 30) {
  if (metrics.length === 0) {
    return 0;
  }

  const startDate = daysAgo(days - 1);
  const inWindow = metrics.filter((metric) => metric.metricDate >= startDate);
  const possible = days * 5;
  const completed = inWindow.reduce(
    (total, metric) => total + metricCompletedCount(metric),
    0,
  );

  return possible > 0 ? Math.round((completed / possible) * 100) : 0;
}

function consecutiveRecordDays(metrics: EngagementMetric[]) {
  const byDate = new Map(metrics.map((metric) => [metric.metricDate, metric]));
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const metric = byDate.get(daysAgo(offset));

    if (!metric || metricCompletedCount(metric) === 0) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function consecutiveLoginDays(metrics: EngagementMetric[]) {
  const byDate = new Map(metrics.map((metric) => [metric.metricDate, metric]));
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const metric = byDate.get(daysAgo(offset));

    if (!metric || metric.loginCount <= 0) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function latestDateFor(
  metrics: EngagementMetric[],
  predicate: (metric: EngagementMetric) => boolean,
) {
  return metrics.find(predicate)?.metricDate || null;
}

export function mapEngagementMetricRow(
  row: EngagementMetricRow,
): EngagementMetric {
  return {
    id: row.id,
    userId: row.user_id,
    metricDate: row.metric_date,
    loginCount: toNumber(row.login_count),
    foodLogged: Boolean(row.food_logged),
    workoutLogged: Boolean(row.workout_logged),
    weightLogged: Boolean(row.weight_logged),
    medicationLogged: Boolean(row.medication_logged),
    inbodyUploaded: Boolean(row.inbody_uploaded),
    adherenceScore: Math.max(0, Math.min(100, toNumber(row.adherence_score))),
    createdAt: row.created_at,
  };
}

export function buildTodayEngagementMetric(input: {
  userId: string;
  foodLogged: boolean;
  workoutLogged: boolean;
  weightLogged: boolean;
  medicationLogged: boolean;
  inbodyUploaded: boolean;
}): EngagementMetric {
  const completed = [
    input.foodLogged,
    input.workoutLogged,
    input.weightLogged,
    input.medicationLogged,
    input.inbodyUploaded,
  ].filter(Boolean).length;

  return {
    id: "derived-today-engagement",
    userId: input.userId,
    metricDate: dateOnly(),
    loginCount: 1,
    foodLogged: input.foodLogged,
    workoutLogged: input.workoutLogged,
    weightLogged: input.weightLogged,
    medicationLogged: input.medicationLogged,
    inbodyUploaded: input.inbodyUploaded,
    adherenceScore: Math.round((completed / 5) * 100),
    createdAt: new Date().toISOString(),
  };
}

export function buildEngagementSummary(
  metrics: EngagementMetric[],
): EngagementSummary {
  const sorted = [...metrics].sort((a, b) =>
    b.metricDate.localeCompare(a.metricDate),
  );
  const todayMetric = sorted.find((metric) => metric.metricDate === dateOnly());
  const completedItems: string[] = [];
  const missingItems: string[] = [];

  const itemMap = [
    ["飲食紀錄", todayMetric?.foodLogged],
    ["訓練紀錄", todayMetric?.workoutLogged],
    ["體重或 InBody", Boolean(todayMetric?.weightLogged || todayMetric?.inbodyUploaded)],
    ["GLP-1 用藥或副作用回報", todayMetric?.medicationLogged],
  ] as const;

  itemMap.forEach(([label, done]) => {
    if (done) {
      completedItems.push(label);
    } else {
      missingItems.push(label);
    }
  });

  const lastLoginDate = latestDateFor(sorted, (metric) => metric.loginCount > 0);
  const lastFoodDate = latestDateFor(sorted, (metric) => metric.foodLogged);
  const lastMedicationDate = latestDateFor(
    sorted,
    (metric) => metric.medicationLogged,
  );
  const daysSinceLastLogin = daysSince(lastLoginDate);
  const daysSinceLastFoodLog = daysSince(lastFoodDate);
  const daysSinceLastMedicationLog = daysSince(lastMedicationDate);
  const healthScore =
    todayMetric?.adherenceScore ??
    Math.round(
      (completionRate(sorted, 7) * 0.6 + completionRate(sorted, 30) * 0.4) || 0,
    );

  return {
    healthScore,
    completedItems,
    missingItems,
    consecutiveRecordDays: consecutiveRecordDays(sorted),
    consecutiveLoginDays: consecutiveLoginDays(sorted),
    completionRate7d: completionRate(sorted, 7),
    completionRate30d: completionRate(sorted, 30),
    lowEngagementAlert:
      daysSinceLastLogin === null || daysSinceLastLogin >= 7,
    foodMissingAlert:
      daysSinceLastFoodLog === null || daysSinceLastFoodLog >= 3,
    glp1MissingAlert:
      daysSinceLastMedicationLog === null || daysSinceLastMedicationLog >= 7,
    daysSinceLastLogin,
    daysSinceLastFoodLog,
    daysSinceLastMedicationLog,
    badgeSkeleton: ["連續紀錄", "蛋白質達標", "回診準備"],
  };
}

export function emptyEngagementSummary(): EngagementSummary {
  return buildEngagementSummary([]);
}

export function createDemoEngagementMetrics(userId = "demo-1") {
  return Array.from({ length: 30 }).map((_, index) => {
    const metricDate = daysAgo(index);
    const foodLogged = index < 2 || index % 3 !== 0;
    const workoutLogged = index % 2 === 0;
    const weightLogged = index % 4 === 0;
    const medicationLogged = index === 1 || index === 8 || index === 15;
    const inbodyUploaded = index === 3 || index === 24;
    const completed = [
      foodLogged,
      workoutLogged,
      weightLogged,
      medicationLogged,
      inbodyUploaded,
    ].filter(Boolean).length;

    return {
      id: `demo-engagement-${index}`,
      userId,
      metricDate,
      loginCount: index < 5 ? 1 : index % 2,
      foodLogged,
      workoutLogged,
      weightLogged,
      medicationLogged,
      inbodyUploaded,
      adherenceScore: Math.round((completed / 5) * 100),
      createdAt: new Date().toISOString(),
    };
  });
}
