import { getCurrentUser } from "@/lib/auth";
import { getClinicAppointments } from "@/lib/appointments";
import { getClinicGlp1Alerts } from "@/lib/glp1-data";
import { getClinicPermissions } from "@/lib/permissions";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  Clinic,
  ClinicContext,
  ClinicDashboardSummary,
  ClinicMember,
  ClinicMemberRole,
  ClinicSubscription,
  ClinicVisitReport,
  PatientInvite,
  SubscriptionPlan,
  VisitReportSummary,
} from "@/lib/types";
import type {
  ClinicInviteCreateInput,
  ClinicMemberUpdateInput,
  ClinicSettingsInput,
  InviteAcceptInput,
} from "@/lib/validation";

type ClinicRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  line_url: string | null;
  website_url: string | null;
  status: Clinic["status"] | null;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  full_name: string | null;
  email?: string | null;
};

type ClinicMemberRow = {
  id: string;
  clinic_id: string;
  user_id: string;
  role: ClinicMemberRole;
  status: ClinicMember["status"] | null;
  active: boolean | null;
  created_at: string;
  clinics?: ClinicRow | ClinicRow[] | null;
  profiles?: ProfileRow | ProfileRow[] | null;
};

type PatientInviteRow = {
  id: string;
  clinic_id: string;
  invite_code: string;
  invited_phone: string | null;
  invited_email: string | null;
  status: PatientInvite["status"];
  expires_at: string;
  accepted_by: string | null;
  created_at: string;
};

type SubscriptionPlanRow = {
  id: string;
  code: string;
  name: string;
  price_monthly: number | string;
  max_patients: number | null;
  max_staff: number | null;
  features: Record<string, unknown>;
  status: SubscriptionPlan["status"];
};

type ClinicSubscriptionRow = {
  id: string;
  clinic_id: string;
  plan_id: string;
  status: ClinicSubscription["status"];
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  subscription_plans?: SubscriptionPlanRow | SubscriptionPlanRow[] | null;
};

const clinicSelect =
  "id,name,slug,logo_url,primary_color,address,phone,email,line_url,website_url,status,created_at,updated_at";

const memberSelect = `id,clinic_id,user_id,role,status,active,created_at,profiles:user_id(full_name),clinics:clinic_id(${clinicSelect})`;

const inviteSelect =
  "id,clinic_id,invite_code,invited_phone,invited_email,status,expires_at,accepted_by,created_at";

const subscriptionPlanSelect =
  "id,code,name,price_monthly,max_patients,max_staff,features,status";

function firstOrNull<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function mapClinic(row: ClinicRow): Clinic {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color || "#0f766e",
    address: row.address,
    phone: row.phone,
    email: row.email,
    lineUrl: row.line_url,
    websiteUrl: row.website_url,
    status: row.status || "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClinicMember(row: ClinicMemberRow): ClinicMember {
  const profile = firstOrNull(row.profiles);

  return {
    id: row.id,
    clinicId: row.clinic_id,
    userId: row.user_id,
    role: row.role,
    status: row.status || (row.active === false ? "disabled" : "active"),
    active: row.active !== false,
    fullName: profile?.full_name || null,
    email: profile?.email || null,
    createdAt: row.created_at,
  };
}

function mapPatientInvite(row: PatientInviteRow): PatientInvite {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    inviteCode: row.invite_code,
    invitedPhone: row.invited_phone,
    invitedEmail: row.invited_email,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedBy: row.accepted_by,
    createdAt: row.created_at,
  };
}

function mapSubscriptionPlan(row: SubscriptionPlanRow): SubscriptionPlan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    priceMonthly: Number(row.price_monthly),
    maxPatients: row.max_patients,
    maxStaff: row.max_staff,
    features: row.features || {},
    status: row.status,
  };
}

function mapClinicSubscription(row: ClinicSubscriptionRow): ClinicSubscription {
  const plan = firstOrNull(row.subscription_plans);

  return {
    id: row.id,
    clinicId: row.clinic_id,
    planId: row.plan_id,
    plan: plan ? mapSubscriptionPlan(plan) : null,
    status: row.status,
    trialEndsAt: row.trial_ends_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
  };
}

function mapVisitReport(row: {
  id: string;
  patient_id: string;
  generated_by: string | null;
  report_period_start: string;
  report_period_end: string;
  ai_summary: VisitReportSummary;
  plain_text_summary: string;
  created_at: string;
}): ClinicVisitReport {
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

function getDemoClinic(): Clinic {
  const now = new Date().toISOString();

  return {
    id: "demo-clinic",
    name: "承新健康診所",
    slug: "chengxin-demo",
    logoUrl: null,
    primaryColor: "#0f766e",
    address: "台北市健康路 100 號",
    phone: "02-1234-5678",
    email: "clinic@example.com",
    lineUrl: "https://line.me/R/ti/p/@chengxin",
    websiteUrl: "https://chengxin.example.com",
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function getDemoClinicContext(): ClinicContext {
  const clinic = getDemoClinic();
  const member: ClinicMember = {
    id: "demo-member-owner",
    clinicId: clinic.id,
    userId: "demo-user",
    role: "owner",
    status: "active",
    active: true,
    fullName: "Demo Owner",
    email: "owner@example.com",
    createdAt: clinic.createdAt,
  };

  return {
    clinic,
    member,
    permissions: getClinicPermissions(member.role),
    persisted: false,
  };
}

export function getDemoSubscriptionPlans(): SubscriptionPlan[] {
  return [
    {
      id: "plan-free",
      code: "free",
      name: "Free",
      priceMonthly: 0,
      maxPatients: 20,
      maxStaff: 2,
      features: { clinic_branding: true, basic_reminders: true },
      status: "active",
    },
    {
      id: "plan-basic",
      code: "clinic_basic",
      name: "Clinic Basic",
      priceMonthly: 2990,
      maxPatients: 200,
      maxStaff: 10,
      features: { ai_visit_reports: true, team_roles: true },
      status: "active",
    },
    {
      id: "plan-pro",
      code: "clinic_pro",
      name: "Clinic Pro",
      priceMonthly: 8990,
      maxPatients: 1000,
      maxStaff: 40,
      features: { advanced_reminders: true, priority_support: true },
      status: "active",
    },
    {
      id: "plan-enterprise",
      code: "enterprise",
      name: "Enterprise",
      priceMonthly: 0,
      maxPatients: null,
      maxStaff: null,
      features: { custom_contract: true, audit_export: true },
      status: "active",
    },
  ];
}

export function getDemoClinicTeam(): ClinicMember[] {
  const context = getDemoClinicContext();

  return [
    context.member,
    {
      id: "demo-member-doctor",
      clinicId: context.clinic.id,
      userId: "demo-doctor",
      role: "doctor",
      status: "active",
      active: true,
      fullName: "林醫師",
      email: "doctor@example.com",
      createdAt: context.clinic.createdAt,
    },
    {
      id: "demo-member-nutritionist",
      clinicId: context.clinic.id,
      userId: "demo-nutritionist",
      role: "nutritionist",
      status: "active",
      active: true,
      fullName: "陳營養師",
      email: "nutrition@example.com",
      createdAt: context.clinic.createdAt,
    },
    {
      id: "demo-member-viewer",
      clinicId: context.clinic.id,
      userId: "demo-viewer",
      role: "viewer",
      status: "invited",
      active: true,
      fullName: "行政預覽",
      email: "viewer@example.com",
      createdAt: context.clinic.createdAt,
    },
  ];
}

export function getDemoInvites(): PatientInvite[] {
  const clinic = getDemoClinic();
  const now = new Date();
  const expires = new Date(now);
  expires.setDate(now.getDate() + 14);

  return [
    {
      id: "demo-invite-1",
      clinicId: clinic.id,
      inviteCode: "CX-DEMO1",
      invitedPhone: "0912-345-678",
      invitedEmail: null,
      status: "pending",
      expiresAt: expires.toISOString(),
      acceptedBy: null,
      createdAt: now.toISOString(),
    },
  ];
}

export async function getClinicContext(): Promise<ClinicContext | null> {
  if (!hasSupabaseConfig()) {
    return getDemoClinicContext();
  }

  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("clinic_members")
    .select(memberSelect)
    .eq("user_id", user.id)
    .in("status", ["active", "invited"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ClinicMemberRow>();

  const clinicRow = firstOrNull(data?.clinics);

  if (error || !data || !clinicRow) {
    return null;
  }

  const member = mapClinicMember(data);

  return {
    clinic: mapClinic(clinicRow),
    member,
    permissions: getClinicPermissions(member.role),
    persisted: true,
  };
}

export async function getClinicSettings() {
  return (await getClinicContext()) || getDemoClinicContext();
}

export async function updateClinicSettings(input: ClinicSettingsInput) {
  if (!hasSupabaseConfig()) {
    return {
      persisted: false,
      clinic: {
        ...getDemoClinic(),
        ...input,
        logoUrl: input.logoUrl || null,
        phone: input.phone || null,
        address: input.address || null,
        email: input.email || null,
        lineUrl: input.lineUrl || null,
        websiteUrl: input.websiteUrl || null,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return { error: "UNAUTHENTICATED" as const };
  }

  if (!context.permissions.canManageClinicSettings) {
    return { error: "FORBIDDEN" as const };
  }

  const { data, error } = await supabase
    .from("clinics")
    .update({
      name: input.name,
      slug: input.slug || context.clinic.slug,
      logo_url: input.logoUrl || null,
      primary_color: input.primaryColor,
      phone: input.phone || null,
      address: input.address || null,
      email: input.email || null,
      line_url: input.lineUrl || null,
      website_url: input.websiteUrl || null,
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.clinic.id)
    .select(clinicSelect)
    .single<ClinicRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" as const, details: error?.message };
  }

  return { persisted: true, clinic: mapClinic(data) };
}

export async function getClinicTeam() {
  if (!hasSupabaseConfig()) {
    return { persisted: false, items: getDemoClinicTeam() };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return { persisted: true, items: [] };
  }

  const { data, error } = await supabase
    .from("clinic_members")
    .select("id,clinic_id,user_id,role,status,active,created_at,profiles:user_id(full_name)")
    .eq("clinic_id", context.clinic.id)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { persisted: true, items: [] };
  }

  return {
    persisted: true,
    items: (data as ClinicMemberRow[]).map(mapClinicMember),
  };
}

export async function updateClinicMember(
  memberId: string,
  input: ClinicMemberUpdateInput,
) {
  if (!hasSupabaseConfig()) {
    const member = getDemoClinicTeam().find((item) => item.id === memberId);

    return {
      persisted: false,
      member: member
        ? {
            ...member,
            role: input.role,
            status: input.status,
            active: input.status !== "disabled",
          }
        : null,
    };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return { error: "UNAUTHENTICATED" as const };
  }

  if (!context.permissions.canManageTeam) {
    return { error: "FORBIDDEN" as const };
  }

  const { data, error } = await supabase
    .from("clinic_members")
    .update({
      role: input.role,
      status: input.status,
      active: input.status !== "disabled",
    })
    .eq("id", memberId)
    .eq("clinic_id", context.clinic.id)
    .select("id,clinic_id,user_id,role,status,active,created_at,profiles:user_id(full_name)")
    .maybeSingle<ClinicMemberRow>();

  if (error) {
    return { error: "SERVER_ERROR" as const, details: error.message };
  }

  return {
    persisted: true,
    member: data ? mapClinicMember(data) : null,
  };
}

function generateInviteCode() {
  return `CX-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function createClinicInvite(input: ClinicInviteCreateInput) {
  if (!hasSupabaseConfig()) {
    const expires = input.expiresAt
      ? new Date(input.expiresAt)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return {
      persisted: false,
      invite: {
        ...getDemoInvites()[0],
        id: `demo-invite-${Date.now()}`,
        inviteCode: generateInviteCode(),
        invitedPhone: input.invitedPhone || null,
        invitedEmail: input.invitedEmail || null,
        expiresAt: expires.toISOString(),
        createdAt: new Date().toISOString(),
      },
    };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return { error: "UNAUTHENTICATED" as const };
  }

  if (!context.permissions.canEditPatient) {
    return { error: "FORBIDDEN" as const };
  }

  const expiresAt = input.expiresAt
    ? new Date(input.expiresAt).toISOString()
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("patient_invites")
    .insert({
      clinic_id: context.clinic.id,
      invite_code: generateInviteCode(),
      invited_phone: input.invitedPhone || null,
      invited_email: input.invitedEmail || null,
      expires_at: expiresAt,
    })
    .select(inviteSelect)
    .single<PatientInviteRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" as const, details: error?.message };
  }

  return { persisted: true, invite: mapPatientInvite(data) };
}

export async function getClinicInvites() {
  if (!hasSupabaseConfig()) {
    return { persisted: false, items: getDemoInvites() };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return { persisted: true, items: [] };
  }

  const { data, error } = await supabase
    .from("patient_invites")
    .select(inviteSelect)
    .eq("clinic_id", context.clinic.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return { persisted: true, items: [] };
  }

  return {
    persisted: true,
    items: (data as PatientInviteRow[]).map(mapPatientInvite),
  };
}

export async function acceptPatientInvite(input: InviteAcceptInput) {
  if (!hasSupabaseConfig()) {
    const demoInvite = getDemoInvites()[0];

    return {
      persisted: false,
      accepted: input.inviteCode === demoInvite.inviteCode,
      clinicId: demoInvite.clinicId,
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return { error: "UNAUTHENTICATED" as const };
  }

  const { data, error } = await supabase.rpc("accept_patient_invite", {
    invite_code_input: input.inviteCode,
  });

  if (error) {
    return {
      error: error.message.includes("INVITE_NOT_FOUND")
        ? ("NOT_FOUND" as const)
        : ("SERVER_ERROR" as const),
      details: error.message,
    };
  }

  const accepted = Array.isArray(data) && data.length > 0;

  return {
    persisted: true,
    accepted,
    clinicId: accepted ? data[0].clinic_id : null,
  };
}

export async function getSubscriptionPlans() {
  if (!hasSupabaseConfig()) {
    return { persisted: false, items: getDemoSubscriptionPlans() };
  }

  const { supabase } = await getCurrentUser();

  if (!supabase) {
    return { persisted: true, items: [] };
  }

  const { data, error } = await supabase
    .from("subscription_plans")
    .select(subscriptionPlanSelect)
    .eq("status", "active")
    .order("price_monthly", { ascending: true });

  if (error || !data) {
    return { persisted: true, items: getDemoSubscriptionPlans() };
  }

  return {
    persisted: true,
    items: (data as SubscriptionPlanRow[]).map(mapSubscriptionPlan),
  };
}

export async function getClinicSubscription() {
  if (!hasSupabaseConfig()) {
    return {
      persisted: false,
      subscription: {
        id: "demo-subscription",
        clinicId: "demo-clinic",
        planId: "plan-basic",
        plan: getDemoSubscriptionPlans()[1],
        status: "trialing" as const,
        trialEndsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        currentPeriodStart: null,
        currentPeriodEnd: null,
        createdAt: new Date().toISOString(),
      },
    };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return { persisted: true, subscription: null };
  }

  const { data, error } = await supabase
    .from("clinic_subscriptions")
    .select(
      `id,clinic_id,plan_id,status,trial_ends_at,current_period_start,current_period_end,created_at,subscription_plans:plan_id(${subscriptionPlanSelect})`,
    )
    .eq("clinic_id", context.clinic.id)
    .maybeSingle<ClinicSubscriptionRow>();

  if (error || !data) {
    return { persisted: true, subscription: null };
  }

  return {
    persisted: true,
    subscription: mapClinicSubscription(data),
  };
}

export async function getClinicDashboardSummary(): Promise<ClinicDashboardSummary> {
  if (!hasSupabaseConfig()) {
    const [patients, appointments] = await Promise.all([
      getClinicGlp1Alerts(),
      getClinicAppointments(),
    ]);

    return {
      totalPatients: patients.length,
      activePatientsThisWeek: Math.max(patients.length - 1, 0),
      highSideEffectAlerts: patients.filter((patient) => patient.highSideEffectAlert).length,
      pendingAppointments: appointments.filter((appointment) => appointment.status === "pending").length,
      inactivePatients7d: patients.filter((patient) => patient.missingRecentReport).length,
      glp1DueSoon: patients.filter((patient) => patient.nextInjectionDueSoon).length,
      recentVisitReports: [],
      persisted: false,
    };
  }

  const { supabase } = await getCurrentUser();
  const context = await getClinicContext();

  if (!supabase || !context) {
    return {
      totalPatients: 0,
      activePatientsThisWeek: 0,
      highSideEffectAlerts: 0,
      pendingAppointments: 0,
      inactivePatients7d: 0,
      glp1DueSoon: 0,
      recentVisitReports: [],
      persisted: true,
    };
  }

  const [clinicPatientsResult, patients, appointments, reportsResult] =
    await Promise.all([
      supabase
        .from("clinic_patients")
        .select("patient_id", { count: "exact" })
        .eq("clinic_id", context.clinic.id)
        .eq("status", "active"),
      getClinicGlp1Alerts(),
      getClinicAppointments(),
      supabase
        .from("clinic_visit_reports")
        .select(
          "id,patient_id,generated_by,report_period_start,report_period_end,ai_summary,plain_text_summary,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const patientIds =
    clinicPatientsResult.data?.map((item: { patient_id: string }) => item.patient_id) ?? [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  let activePatientsThisWeek = 0;

  if (patientIds.length > 0) {
    const { data } = await supabase
      .from("engagement_metrics")
      .select("user_id")
      .in("user_id", patientIds)
      .gte("metric_date", sevenDaysAgo);

    activePatientsThisWeek = new Set(
      (data as { user_id: string }[] | null)?.map((item) => item.user_id) ?? [],
    ).size;
  }

  return {
    totalPatients: clinicPatientsResult.count ?? patientIds.length,
    activePatientsThisWeek,
    highSideEffectAlerts: patients.filter((patient) => patient.highSideEffectAlert).length,
    pendingAppointments: appointments.filter((appointment) => appointment.status === "pending").length,
    inactivePatients7d: Math.max(patientIds.length - activePatientsThisWeek, 0),
    glp1DueSoon: patients.filter((patient) => patient.nextInjectionDueSoon).length,
    recentVisitReports:
      (reportsResult.data as Parameters<typeof mapVisitReport>[0][] | null)?.map(
        mapVisitReport,
      ) ?? [],
    persisted: true,
  };
}
