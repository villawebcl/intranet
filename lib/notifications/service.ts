import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { type AppRole } from "@/lib/constants/domain";
import { getServerEnv } from "@/lib/env";
import { logServerEvent } from "@/lib/observability/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

type NotificationEventType =
  | "document_uploaded"
  | "document_approved"
  | "document_rejected"
  | "document_download_requested";

type InsertNotificationsParams = {
  supabase: SupabaseClient;
  recipientUserIds: string[];
  eventType: NotificationEventType;
  payload: Record<string, unknown>;
  createdBy: string;
};

export type InsertedNotification = {
  id: string;
  user_id: string;
};

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

const REVIEW_NOTIFICATION_ROLES: AppRole[] = ["admin", "rrhh"];

export async function getUserIdsByRoles(roles: AppRole[]) {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.from("profiles").select("id").in("role", roles);
    if (error) {
      console.error("profiles lookup failed", error);
      return [];
    }

    return data.map((row) => row.id);
  } catch (error) {
    console.error("admin client unavailable for profile lookup", error);
    return [];
  }
}

export async function getDefaultReviewerUserIds() {
  return getUserIdsByRoles(REVIEW_NOTIFICATION_ROLES);
}

export async function getUserEmailById(userId: string) {
  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("get user email from profiles failed", error);
      return null;
    }

    return data?.email ?? null;
  } catch (error) {
    console.error("admin client unavailable for user email", error);
    return null;
  }
}

export async function insertNotifications(params: InsertNotificationsParams) {
  const uniqueUserIds = [...new Set(params.recipientUserIds.filter(Boolean))];
  if (!uniqueUserIds.length) {
    return [] as InsertedNotification[];
  }

  const rows = uniqueUserIds.map((userId) => ({
    user_id: userId,
    event_type: params.eventType,
    payload: params.payload,
    created_by: params.createdBy,
  }));

  const { data, error } = await params.supabase.from("notifications").insert(rows).select("id, user_id");
  if (error) {
    console.error("insert notifications failed", error);
    return [] as InsertedNotification[];
  }

  return data ?? [];
}

export async function getUserEmailsByIds(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueUserIds.length) {
    return {} as Record<string, string>;
  }

  try {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("id, email")
      .in("id", uniqueUserIds);

    if (error) {
      console.error("get user emails from profiles failed", error);
      return {} as Record<string, string>;
    }

    return Object.fromEntries(
      (data ?? []).filter((row) => row.email).map((row) => [row.id, row.email as string]),
    );
  } catch (error) {
    console.error("admin client unavailable for user emails", error);
    return {} as Record<string, string>;
  }
}

export async function markNotificationsSent(
  notificationIds: string[],
  options?: { adminClient?: SupabaseAdminClient },
) {
  const uniqueIds = [...new Set(notificationIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return;
  }

  let adminClient = options?.adminClient;
  if (!adminClient) {
    try {
      adminClient = createSupabaseAdminClient();
    } catch (error) {
      console.error("admin client unavailable for mark notifications sent", error);
      return;
    }
  }

  const { error } = await adminClient
    .from("notifications")
    .update({ sent_at: new Date().toISOString() })
    .in("id", uniqueIds)
    .is("sent_at", null);

  if (error) {
    console.error("mark notifications sent failed", error);
  }
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "invalid";
  }

  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function sendResendEmail(params: SendEmailParams) {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY || !env.NOTIFICATIONS_FROM_EMAIL) {
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.NOTIFICATIONS_FROM_EMAIL,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      await logServerEvent("error", "email_send_failed", {
        provider: "resend",
        status: response.status,
        body,
      });
      return false;
    }

    await logServerEvent("info", "email_sent", {
      provider: "resend",
      recipient: maskEmail(params.to),
    });
    return true;
  } catch (error) {
    await logServerEvent("error", "email_send_failed", {
      provider: "resend",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
