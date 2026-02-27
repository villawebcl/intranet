import "server-only";

import { type SupabaseClient } from "@supabase/supabase-js";

import { type FolderType } from "@/lib/constants/domain";
import {
  buildDocumentReviewedEmail,
  buildDocumentUploadedEmail,
} from "@/lib/notifications/email-templates";
import {
  getDefaultReviewerUserIds,
  getUserEmailsByIds,
  insertNotifications,
  markNotificationsSent,
  sendResendEmail,
  type InsertedNotification,
} from "@/lib/notifications/service";

type NotificationContext = {
  supabase: SupabaseClient;
  actorUserId: string;
};

async function sendEmailForNotifications(params: {
  notifications: InsertedNotification[];
  subject: string;
  html: string;
  supabase: SupabaseClient;
}) {
  if (!params.notifications.length) {
    return;
  }

  const emailsByUserId = await getUserEmailsByIds(
    params.notifications.map((notification) => notification.user_id),
  );

  const sentNotificationIds = (
    await Promise.all(
      params.notifications.map(async (notification) => {
        const recipientEmail = emailsByUserId[notification.user_id];
        if (!recipientEmail) {
          return null;
        }

        const sent = await sendResendEmail({
          to: recipientEmail,
          subject: params.subject,
          html: params.html,
        });

        return sent ? notification.id : null;
      }),
    )
  ).filter((notificationId): notificationId is string => Boolean(notificationId));

  // sent_at represents confirmed email deliveries, not mere attempts.
  await markNotificationsSent(sentNotificationIds);
}

export async function notifyDocumentUploaded(params: NotificationContext & {
  workerId: string;
  documentId: string;
  folderType: FolderType;
  fileName: string;
  workerName: string;
}) {
  const reviewerUserIds = await getDefaultReviewerUserIds();
  const notifications = await insertNotifications({
    supabase: params.supabase,
    recipientUserIds: [...reviewerUserIds, params.actorUserId],
    eventType: "document_uploaded",
    payload: {
      workerId: params.workerId,
      documentId: params.documentId,
      folderType: params.folderType,
      fileName: params.fileName,
      status: "pendiente",
    },
    createdBy: params.actorUserId,
  });

  const template = buildDocumentUploadedEmail({
    fileName: params.fileName,
    workerName: params.workerName,
    folderType: params.folderType,
  });

  await sendEmailForNotifications({
    notifications,
    subject: template.subject,
    html: template.html,
    supabase: params.supabase,
  });
}

export async function notifyDocumentReviewed(params: NotificationContext & {
  workerId: string;
  documentId: string;
  folderType: FolderType;
  fileName: string;
  workerName: string;
  uploadedBy: string | null;
  decision: "aprobado" | "rechazado";
  rejectionReason: string | null;
}) {
  const reviewerUserIds = await getDefaultReviewerUserIds();
  const notifications = await insertNotifications({
    supabase: params.supabase,
    recipientUserIds: [...reviewerUserIds, params.uploadedBy].filter(Boolean),
    eventType: params.decision === "aprobado" ? "document_approved" : "document_rejected",
    payload: {
      workerId: params.workerId,
      documentId: params.documentId,
      folderType: params.folderType,
      fileName: params.fileName,
      decision: params.decision,
      rejectionReason: params.decision === "rechazado" ? params.rejectionReason : null,
    },
    createdBy: params.actorUserId,
  });

  const template = buildDocumentReviewedEmail({
    fileName: params.fileName,
    workerName: params.workerName,
    folderType: params.folderType,
    decision: params.decision,
    rejectionReason: params.decision === "rechazado" ? params.rejectionReason : null,
  });

  await sendEmailForNotifications({
    notifications,
    subject: template.subject,
    html: template.html,
    supabase: params.supabase,
  });
}

export async function notifyDownloadRequested(params: NotificationContext & {
  workerId: string;
  documentId: string;
  requestId: string;
  folderType: FolderType;
  fileName: string;
  requestReason: string;
}) {
  const { error } = await params.supabase.rpc("create_download_request_notifications", {
    p_request_id: params.requestId,
  });

  if (error) {
    console.error("create_download_request_notifications failed", {
      requestId: params.requestId,
      error,
    });
  }
}
