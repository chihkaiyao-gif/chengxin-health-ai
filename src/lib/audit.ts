import { getCurrentUser } from "@/lib/auth";
import { getClinicContext } from "@/lib/clinic-saas";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type { AuditAction, AuditLog } from "@/lib/types";
import type { AuditLogQueryInput } from "@/lib/validation";

type AuditLogRow = {
  id: string;
  clinic_id: string | null;
  actor_user_id: string | null;
  target_user_id: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor?: { full_name: string | null } | { full_name: string | null }[] | null;
  target?: { full_name: string | null } | { full_name: string | null }[] | null;
};

export type AuditLogInput = {
  clinicId?: string | null;
  targetUserId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
};

function firstName(
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

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    actorUserId: row.actor_user_id,
    actorName: firstName(row.actor),
    targetUserId: row.target_user_id,
    targetName: firstName(row.target),
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata || {},
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

function getDemoAuditLogs(): AuditLog[] {
  const now = new Date();
  const earlier = new Date(now);
  earlier.setHours(now.getHours() - 3);

  return [
    {
      id: "demo-audit-1",
      clinicId: "demo-clinic",
      actorUserId: "demo-doctor",
      actorName: "林醫師",
      targetUserId: "demo-1",
      targetName: "王小明",
      action: "visit_report.generate",
      resourceType: "clinic_visit_report",
      resourceId: "demo-visit-report",
      metadata: { provider: "demo_fallback", period: "30d" },
      ipAddress: "127.0.0.1",
      userAgent: "Demo Browser",
      createdAt: now.toISOString(),
    },
    {
      id: "demo-audit-2",
      clinicId: "demo-clinic",
      actorUserId: "demo-owner",
      actorName: "Demo Owner",
      targetUserId: null,
      targetName: null,
      action: "clinic_settings.update",
      resourceType: "clinic",
      resourceId: "demo-clinic",
      metadata: { field: "primaryColor" },
      ipAddress: "127.0.0.1",
      userAgent: "Demo Browser",
      createdAt: earlier.toISOString(),
    },
  ];
}

function requestIpAddress(request?: Request) {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const direct = request?.headers.get("x-real-ip")?.trim();
  const value = forwarded || direct || null;

  if (!value) {
    return null;
  }

  return /^[0-9a-fA-F:.]+$/.test(value) ? value : null;
}

export async function resolveClinicIdForUser(
  targetUserId?: string | null,
  fallbackClinicId?: string | null,
) {
  if (fallbackClinicId || !hasSupabaseConfig()) {
    return fallbackClinicId || null;
  }

  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return null;
  }

  if (targetUserId) {
    const { data: clinicPatient } = await supabase
      .from("clinic_patients")
      .select("clinic_id")
      .eq("patient_id", targetUserId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle<{ clinic_id: string | null }>();

    if (clinicPatient?.clinic_id) {
      return clinicPatient.clinic_id;
    }

    const { data: legacyLink } = await supabase
      .from("patient_clinic_links")
      .select("clinic_id")
      .eq("patient_id", targetUserId)
      .eq("active", true)
      .limit(1)
      .maybeSingle<{ clinic_id: string | null }>();

    if (legacyLink?.clinic_id) {
      return legacyLink.clinic_id;
    }
  }

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle<{ clinic_id: string | null }>();

  return membership?.clinic_id || null;
}

export async function logAuditEvent(input: AuditLogInput, request?: Request) {
  if (!hasSupabaseConfig()) {
    return { persisted: false };
  }

  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return { persisted: false };
  }

  const clinicId = await resolveClinicIdForUser(input.targetUserId, input.clinicId);

  const { error } = await supabase.from("audit_logs").insert({
    clinic_id: clinicId,
    actor_user_id: user.id,
    target_user_id: input.targetUserId || null,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId || null,
    metadata: input.metadata || {},
    ip_address: requestIpAddress(request),
    user_agent: request?.headers.get("user-agent")?.slice(0, 500) || null,
  });

  return { persisted: !error };
}

export async function getClinicAuditLogs(filters: AuditLogQueryInput) {
  if (!hasSupabaseConfig()) {
    const items = getDemoAuditLogs().filter((item) => {
      if (filters.action && item.action !== filters.action) {
        return false;
      }
      if (filters.actorUserId && item.actorUserId !== filters.actorUserId) {
        return false;
      }
      if (filters.targetUserId && item.targetUserId !== filters.targetUserId) {
        return false;
      }
      return true;
    });

    return {
      persisted: false,
      items,
      totalItems: items.length,
    };
  }

  const context = await getClinicContext();
  const { supabase } = await getCurrentUser();

  if (!supabase || !context) {
    return { persisted: true, items: [], totalItems: 0 };
  }

  if (
    !context.permissions.canManageClinicSettings &&
    !context.permissions.canGenerateVisitReport
  ) {
    return { error: "FORBIDDEN" as const };
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  let query = supabase
    .from("audit_logs")
    .select(
      "id,clinic_id,actor_user_id,target_user_id,action,resource_type,resource_id,metadata,ip_address,user_agent,created_at,actor:actor_user_id(full_name),target:target_user_id(full_name)",
      { count: "exact" },
    )
    .eq("clinic_id", context.clinic.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  if (filters.actorUserId) {
    query = query.eq("actor_user_id", filters.actorUserId);
  }

  if (filters.targetUserId) {
    query = query.eq("target_user_id", filters.targetUserId);
  }

  if (filters.dateFrom) {
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo) {
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  const { data, error, count } = await query;

  if (error || !data) {
    return { persisted: true, items: [], totalItems: 0 };
  }

  return {
    persisted: true,
    items: (data as AuditLogRow[]).map(mapAuditLog),
    totalItems: count || 0,
  };
}
