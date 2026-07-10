import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentTimeSlot,
} from "@/lib/types";
import type {
  AppointmentRequestInput,
  ClinicAppointmentUpdateInput,
} from "@/lib/validation";

export const appointmentSelect =
  "id,user_id,clinic_id,reason,preferred_date,preferred_time_slot,status,staff_note,created_at,updated_at";

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  pending: "待確認",
  confirmed: "已確認",
  canceled: "已取消",
  completed: "已完成",
};

export const appointmentTimeSlotLabels: Record<AppointmentTimeSlot, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
  flexible: "皆可",
};

type AppointmentRow = {
  id: string;
  user_id: string;
  clinic_id: string | null;
  reason: string;
  preferred_date: string;
  preferred_time_slot: AppointmentTimeSlot;
  status: AppointmentStatus;
  staff_note: string | null;
  created_at: string;
  updated_at: string;
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

function mapAppointmentRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    userId: row.user_id,
    clinicId: row.clinic_id,
    patientName: profileName(row.profiles),
    reason: row.reason,
    preferredDate: row.preferred_date,
    preferredTimeSlot: row.preferred_time_slot,
    status: row.status,
    staffNote: row.staff_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildDemoAppointment(
  input: AppointmentRequestInput,
  id = "demo-appointment-1",
): Appointment {
  const now = new Date().toISOString();

  return {
    id,
    userId: "demo-user",
    clinicId: "demo-clinic",
    patientName: "示範病人",
    reason: input.reason,
    preferredDate: input.preferredDate,
    preferredTimeSlot: input.preferredTimeSlot,
    status: "pending",
    staffNote: input.note || null,
    createdAt: now,
    updatedAt: now,
  };
}

export function getDemoAppointments(): Appointment[] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return [
    {
      id: "demo-appointment-1",
      userId: "demo-1",
      clinicId: "demo-clinic",
      patientName: "王小明",
      reason: "GLP-1 即將用完，想安排回診與醫師討論。",
      preferredDate: tomorrow.toISOString().slice(0, 10),
      preferredTimeSlot: "afternoon",
      status: "pending",
      staffNote: null,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
    {
      id: "demo-appointment-2",
      userId: "demo-2",
      clinicId: "demo-clinic",
      patientName: "陳美玲",
      reason: "副作用偏高，希望診所協助追蹤。",
      preferredDate: nextWeek.toISOString().slice(0, 10),
      preferredTimeSlot: "morning",
      status: "confirmed",
      staffNote: "已電話確認，請攜帶近期紀錄。",
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    },
  ];
}

async function getDefaultClinicId(userId: string) {
  const { supabase } = await getCurrentUser();

  if (!supabase) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_clinic_id")
    .eq("id", userId)
    .maybeSingle<{ default_clinic_id: string | null }>();

  if (profile?.default_clinic_id) {
    return profile.default_clinic_id;
  }

  const { data: link } = await supabase
    .from("patient_clinic_links")
    .select("clinic_id")
    .eq("patient_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle<{ clinic_id: string | null }>();

  return link?.clinic_id || null;
}

export async function createAppointmentForCurrentUser(
  input: AppointmentRequestInput,
) {
  if (!hasSupabaseConfig()) {
    return {
      persisted: false,
      appointment: buildDemoAppointment(input),
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return { error: "UNAUTHENTICATED" as const };
  }

  const clinicId = await getDefaultClinicId(user.id);
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: user.id,
      clinic_id: clinicId,
      reason: input.reason,
      preferred_date: input.preferredDate,
      preferred_time_slot: input.preferredTimeSlot,
      staff_note: input.note || null,
    })
    .select(appointmentSelect)
    .single<AppointmentRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" as const, details: error?.message };
  }

  return {
    persisted: true,
    appointment: mapAppointmentRow(data),
  };
}

export async function getAppointmentsForCurrentUser(): Promise<Appointment[]> {
  if (!hasSupabaseConfig()) {
    return getDemoAppointments().slice(0, 1);
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(appointmentSelect)
    .eq("user_id", user.id)
    .order("preferred_date", { ascending: false })
    .limit(20);

  if (error || !data) {
    return [];
  }

  return (data as AppointmentRow[]).map(mapAppointmentRow);
}

export async function getClinicAppointments(): Promise<Appointment[]> {
  if (!hasSupabaseConfig()) {
    return getDemoAppointments();
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("appointments")
    .select(`${appointmentSelect},profiles:user_id(full_name)`)
    .order("preferred_date", { ascending: true })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return (data as AppointmentRow[]).map(mapAppointmentRow);
}

export async function updateClinicAppointment(
  appointmentId: string,
  input: ClinicAppointmentUpdateInput,
) {
  if (!hasSupabaseConfig()) {
    const appointment = getDemoAppointments().find(
      (item) => item.id === appointmentId,
    );

    return {
      persisted: false,
      appointment: appointment
        ? {
            ...appointment,
            status: input.status,
            staffNote: input.staffNote || appointment.staffNote,
            updatedAt: new Date().toISOString(),
          }
        : null,
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!user || !supabase) {
    return { error: "UNAUTHENTICATED" as const };
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({
      status: input.status,
      staff_note: input.staffNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appointmentId)
    .select(appointmentSelect)
    .maybeSingle<AppointmentRow>();

  if (error) {
    return { error: "SERVER_ERROR" as const, details: error.message };
  }

  return {
    persisted: true,
    appointment: data ? mapAppointmentRow(data) : null,
  };
}
