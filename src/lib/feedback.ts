import { getCurrentUser } from "@/lib/auth";
import { getClinicContext, getDemoClinicContext } from "@/lib/clinic-saas";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type { FeedbackItem, FeedbackStatus, FeedbackType } from "@/lib/types";
import type {
  ClinicFeedbackQueryInput,
  FeedbackCreateInput,
} from "@/lib/validation";

type FeedbackRow = {
  id: string;
  user_id: string;
  clinic_id: string | null;
  page_path: string;
  feedback_type: FeedbackType;
  message: string;
  screenshot_url: string | null;
  status: FeedbackStatus;
  created_at: string;
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
};

const feedbackSelect =
  "id,user_id,clinic_id,page_path,feedback_type,message,screenshot_url,status,created_at";

function firstProfileName(
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

function mapFeedbackRow(row: FeedbackRow): FeedbackItem {
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
}

export function getDemoFeedbackItems(): FeedbackItem[] {
  const now = new Date();
  const earlier = new Date(now);
  earlier.setHours(now.getHours() - 2);

  return [
    {
      id: "demo-feedback-1",
      userId: "demo-1",
      userName: "王小明",
      clinicId: "demo-clinic",
      pagePath: "/nutrition",
      feedbackType: "confusing",
      message: "拍餐點後想知道份量信心分數可以怎麼解讀，建議加一行短說明。",
      screenshotUrl: null,
      status: "open",
      createdAt: now.toISOString(),
    },
    {
      id: "demo-feedback-2",
      userId: "demo-staff",
      userName: "陳護理師",
      clinicId: "demo-clinic",
      pagePath: "/clinic/patients/demo-1",
      feedbackType: "idea",
      message: "病人詳情頁若能把 GLP-1 副作用趨勢放在更上面，醫師 demo 時會更快看到重點。",
      screenshotUrl: null,
      status: "reviewed",
      createdAt: earlier.toISOString(),
    },
  ];
}

async function getDefaultClinicIdForCurrentUser(userId: string) {
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

  const { data: clinicPatient } = await supabase
    .from("clinic_patients")
    .select("clinic_id")
    .eq("patient_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle<{ clinic_id: string | null }>();

  if (clinicPatient?.clinic_id) {
    return clinicPatient.clinic_id;
  }

  const { data: legacyLink } = await supabase
    .from("patient_clinic_links")
    .select("clinic_id")
    .eq("patient_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle<{ clinic_id: string | null }>();

  return legacyLink?.clinic_id || null;
}

export async function createFeedbackForCurrentUser(input: FeedbackCreateInput) {
  if (!hasSupabaseConfig()) {
    const now = new Date().toISOString();

    return {
      persisted: false,
      feedback: {
        id: `demo-feedback-${crypto.randomUUID()}`,
        userId: "demo-user",
        userName: "示範使用者",
        clinicId: getDemoClinicContext().clinic.id,
        pagePath: input.pagePath,
        feedbackType: input.feedbackType,
        message: input.message,
        screenshotUrl: input.screenshotUrl || null,
        status: "open" as const,
        createdAt: now,
      },
    };
  }

  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return { error: "UNAUTHENTICATED" as const };
  }

  const clinicId = await getDefaultClinicIdForCurrentUser(user.id);
  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      clinic_id: clinicId,
      page_path: input.pagePath,
      feedback_type: input.feedbackType,
      message: input.message,
      screenshot_url: input.screenshotUrl || null,
    })
    .select(feedbackSelect)
    .single<FeedbackRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" as const, details: error?.message };
  }

  return {
    persisted: true,
    feedback: mapFeedbackRow(data),
  };
}

export async function getClinicFeedback(filters: ClinicFeedbackQueryInput) {
  if (!hasSupabaseConfig()) {
    const items = getDemoFeedbackItems().filter((item) => {
      if (filters.status && item.status !== filters.status) {
        return false;
      }

      if (filters.feedbackType && item.feedbackType !== filters.feedbackType) {
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
    return { error: "FORBIDDEN" as const };
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  let query = supabase
    .from("feedback")
    .select(`${feedbackSelect},profiles:user_id(full_name)`, { count: "exact" })
    .eq("clinic_id", context.clinic.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.feedbackType) {
    query = query.eq("feedback_type", filters.feedbackType);
  }

  const { data, error, count } = await query;

  if (error || !data) {
    return { persisted: true, items: [], totalItems: 0 };
  }

  return {
    persisted: true,
    items: (data as FeedbackRow[]).map(mapFeedbackRow),
    totalItems: count || 0,
  };
}
