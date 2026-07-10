import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import type {
  NotificationChannel,
  NotificationLog,
  NotificationStatus,
} from "@/lib/types";
import type { NotificationSendDemoInput } from "@/lib/validation";

type ProviderSendInput = {
  userId: string;
  clinicId?: string | null;
  title: string;
  message: string;
};

type ProviderSendResult = {
  status: NotificationStatus;
  providerResponse: Record<string, unknown>;
};

export type NotificationProvider = {
  channel: NotificationChannel;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
};

const demoProviders: Record<NotificationChannel, NotificationProvider> = {
  line: {
    channel: "line",
    async send(input) {
      return createDemoProviderResponse("line", input);
    },
  },
  email: {
    channel: "email",
    async send(input) {
      return createDemoProviderResponse("email", input);
    },
  },
  sms: {
    channel: "sms",
    async send(input) {
      return createDemoProviderResponse("sms", input);
    },
  },
  in_app: {
    channel: "in_app",
    async send(input) {
      return createDemoProviderResponse("in_app", input);
    },
  },
};

function createDemoProviderResponse(
  channel: NotificationChannel,
  input: ProviderSendInput,
): ProviderSendResult {
  return {
    status: "sent",
    providerResponse: {
      demo: true,
      channel,
      userId: input.userId,
      clinicId: input.clinicId || null,
      acceptedAt: new Date().toISOString(),
      note: "Provider skeleton only. No real LINE, SMS, or email was sent.",
    },
  };
}

function buildNotificationLog(input: {
  id: string;
  userId: string;
  clinicId?: string | null;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationStatus;
  providerResponse: Record<string, unknown>;
  createdAt?: string;
}): NotificationLog {
  return {
    id: input.id,
    userId: input.userId,
    clinicId: input.clinicId || null,
    channel: input.channel,
    title: input.title,
    message: input.message,
    status: input.status,
    providerResponse: input.providerResponse,
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

type NotificationLogRow = {
  id: string;
  user_id: string;
  clinic_id: string | null;
  channel: NotificationChannel;
  title: string;
  message: string;
  status: NotificationStatus;
  provider_response: Record<string, unknown>;
  created_at: string;
};

function mapNotificationLogRow(row: NotificationLogRow): NotificationLog {
  return buildNotificationLog({
    id: row.id,
    userId: row.user_id,
    clinicId: row.clinic_id,
    channel: row.channel,
    title: row.title,
    message: row.message,
    status: row.status,
    providerResponse: row.provider_response,
    createdAt: row.created_at,
  });
}

export async function sendDemoNotification(input: NotificationSendDemoInput) {
  const { supabase, user } = await getCurrentUser();
  const userId = input.userId || user?.id || "demo-user";
  const provider = demoProviders[input.channel];
  const providerResult = await provider.send({
    userId,
    clinicId: input.clinicId || null,
    title: input.title,
    message: input.message,
  });

  if (!hasSupabaseConfig() || !supabase || !user) {
    return {
      persisted: false,
      notificationLog: buildNotificationLog({
        id: `demo-notification-${Date.now()}`,
        userId,
        clinicId: input.clinicId || null,
        channel: input.channel,
        title: input.title,
        message: input.message,
        status: providerResult.status,
        providerResponse: providerResult.providerResponse,
      }),
    };
  }

  const { data, error } = await supabase
    .from("notification_logs")
    .insert({
      user_id: userId,
      clinic_id: input.clinicId || null,
      channel: input.channel,
      title: input.title,
      message: input.message,
      status: providerResult.status,
      provider_response: providerResult.providerResponse,
    })
    .select(
      "id,user_id,clinic_id,channel,title,message,status,provider_response,created_at",
    )
    .single<NotificationLogRow>();

  if (error || !data) {
    return { error: "SERVER_ERROR" as const, details: error?.message };
  }

  return {
    persisted: true,
    notificationLog: mapNotificationLogRow(data),
  };
}
