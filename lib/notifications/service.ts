import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { type AppRole } from "@/lib/constants/domain";
import { getServerEnv } from "@/lib/env";
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
    const { data, error } = await adminClient.auth.admin.getUserById(userId);
    if (error) {
      console.error("get user email failed", error);
      return null;
    }

    return data.user.email ?? null;
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

  const emails: Record<string, string> = {};
  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const email = await getUserEmailById(userId);
      if (email) {
        emails[userId] = email;
      }
    }),
  );

  return emails;
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
      console.error("resend email failed", { status: response.status, body });
      return false;
    }

    console.log("resend email sent", { to: params.to, subject: params.subject, at: new Date().toISOString() });
    return true;
  } catch (error) {
    console.error("resend email failed", error);
    return false;
  }
}
