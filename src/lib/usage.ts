import { getCurrentUser } from "@/lib/auth";
import {
  getClinicContext,
  getClinicSubscription,
  getDemoSubscriptionPlans,
} from "@/lib/clinic-saas";
import { resolveClinicIdForUser } from "@/lib/audit";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  ClinicUsageSummary,
  SubscriptionPlan,
  UsageLimitKey,
} from "@/lib/types";

type UsageCounterRow = {
  id: string;
  clinic_id: string;
  period_start: string;
  period_end: string;
  ai_food_analysis_count: number | null;
  ai_inbody_analysis_count: number | null;
  ai_visit_report_count: number | null;
  active_patient_count: number | null;
  staff_count: number | null;
  created_at: string;
  updated_at: string;
};

export type UsageCounterName =
  | "aiFoodAnalysis"
  | "aiInbodyAnalysis"
  | "aiVisitReports";

const rpcCounterNameByName: Record<UsageCounterName, string> = {
  aiFoodAnalysis: "ai_food_analysis",
  aiInbodyAnalysis: "ai_inbody_analysis",
  aiVisitReports: "ai_visit_report",
};

function getCurrentPeriod(today = new Date()) {
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

function featureNumber(plan: SubscriptionPlan | null, key: string) {
  const value = plan?.features?.[key];

  if (typeof value === "number") {
    return value;
  }

  return null;
}

function buildLimits(plan: SubscriptionPlan | null) {
  return {
    maxPatients: plan?.maxPatients ?? null,
    maxStaff: plan?.maxStaff ?? null,
    aiFoodAnalysisMonthly: featureNumber(plan, "ai_food_analysis_monthly"),
    aiInbodyAnalysisMonthly: featureNumber(plan, "ai_inbody_analysis_monthly"),
    aiVisitReportsMonthly: featureNumber(plan, "ai_visit_reports_monthly"),
  };
}

async function getLiveCounts(clinicId: string) {
  const { supabase } = await getCurrentUser();

  if (!supabase) {
    return { activePatients: 0, staff: 0 };
  }

  const [patientsResult, staffResult] = await Promise.all([
    supabase
      .from("clinic_patients")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("status", "active"),
    supabase
      .from("clinic_members")
      .select("id", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .neq("status", "disabled"),
  ]);

  return {
    activePatients: patientsResult.count || 0,
    staff: staffResult.count || 0,
  };
}

function buildDemoUsageSummary(): ClinicUsageSummary {
  const { periodStart, periodEnd } = getCurrentPeriod();
  const plan = getDemoSubscriptionPlans()[1];

  return {
    clinicId: "demo-clinic",
    plan,
    periodStart,
    periodEnd,
    counts: {
      activePatients: 3,
      staff: 4,
      aiFoodAnalysis: 18,
      aiInbodyAnalysis: 6,
      aiVisitReports: 3,
    },
    limits: buildLimits(plan),
    persisted: false,
  };
}

export async function getClinicUsageSummary(): Promise<ClinicUsageSummary> {
  if (!hasSupabaseConfig()) {
    return buildDemoUsageSummary();
  }

  const context = await getClinicContext();
  const { supabase } = await getCurrentUser();

  if (!context || !supabase) {
    return {
      ...buildDemoUsageSummary(),
      clinicId: "unavailable",
      plan: null,
      persisted: true,
    };
  }

  const { subscription } = await getClinicSubscription();
  const plan = subscription?.plan || null;
  const { periodStart, periodEnd } = getCurrentPeriod();

  const [{ data: counter }, liveCounts] = await Promise.all([
    supabase
      .from("usage_counters")
      .select(
        "id,clinic_id,period_start,period_end,ai_food_analysis_count,ai_inbody_analysis_count,ai_visit_report_count,active_patient_count,staff_count,created_at,updated_at",
      )
      .eq("clinic_id", context.clinic.id)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle<UsageCounterRow>(),
    getLiveCounts(context.clinic.id),
  ]);

  return {
    clinicId: context.clinic.id,
    plan,
    periodStart,
    periodEnd,
    counts: {
      activePatients: liveCounts.activePatients,
      staff: liveCounts.staff,
      aiFoodAnalysis: counter?.ai_food_analysis_count || 0,
      aiInbodyAnalysis: counter?.ai_inbody_analysis_count || 0,
      aiVisitReports: counter?.ai_visit_report_count || 0,
    },
    limits: buildLimits(plan),
    persisted: true,
  };
}

export async function assertClinicUsageLimit(limitKey: UsageLimitKey) {
  const summary = await getClinicUsageSummary();
  const limit = summary.limits[limitKey];

  if (limit === null) {
    return { allowed: true as const, summary };
  }

  const countByLimit: Record<UsageLimitKey, number> = {
    maxPatients: summary.counts.activePatients,
    maxStaff: summary.counts.staff,
    aiFoodAnalysisMonthly: summary.counts.aiFoodAnalysis,
    aiInbodyAnalysisMonthly: summary.counts.aiInbodyAnalysis,
    aiVisitReportsMonthly: summary.counts.aiVisitReports,
  };

  if (countByLimit[limitKey] >= limit) {
    return {
      allowed: false as const,
      summary,
      message: "Current subscription usage limit has been reached.",
    };
  }

  return { allowed: true as const, summary };
}

export async function incrementUsageCounter(input: {
  clinicId?: string | null;
  targetUserId?: string | null;
  counter: UsageCounterName;
}) {
  if (!hasSupabaseConfig()) {
    return { persisted: false };
  }

  const { supabase } = await getCurrentUser();

  if (!supabase) {
    return { persisted: false };
  }

  const clinicId = await resolveClinicIdForUser(input.targetUserId, input.clinicId);

  if (!clinicId) {
    return { persisted: false };
  }

  const { error } = await supabase.rpc("increment_usage_counter", {
    target_clinic_id: clinicId,
    counter_name: rpcCounterNameByName[input.counter],
  });

  return { persisted: !error };
}
