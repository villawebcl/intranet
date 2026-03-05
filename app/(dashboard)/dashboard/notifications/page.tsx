import Link from "next/link";
import { redirect } from "next/navigation";

import { sendTestEmailAction } from "@/app/(dashboard)/dashboard/notifications/actions";
import { FlashMessages } from "@/components/ui/flash-messages";
import { ModalButton } from "@/components/ui/modal-button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { canViewAudit } from "@/lib/auth/roles";
import { folderLabels, folderTypes } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type NotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type NotificationPayload = Record<string, unknown> | null;
type EmailFilterValue = "all" | "sent" | "pending";

const notificationEventOptions = [
  "document_uploaded",
  "document_approved",
  "document_rejected",
  "document_download_requested",
] as const;

type NotificationEventFilter = (typeof notificationEventOptions)[number] | "all";
const NOTIFICATIONS_PAGE_SIZE = 25;

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getEventFilter(value: string | string[] | undefined): NotificationEventFilter {
  const normalized = getStringParam(value);
  if (!normalized) return "all";

  return notificationEventOptions.includes(normalized as (typeof notificationEventOptions)[number])
    ? (normalized as NotificationEventFilter)
    : "all";
}

function getEmailFilter(value: string | string[] | undefined): EmailFilterValue {
  const normalized = getStringParam(value);
  if (normalized === "sent" || normalized === "pending") {
    return normalized;
  }
  return "all";
}

function getPageParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function buildNotificationsPath(eventFilter: NotificationEventFilter, emailFilter: EmailFilterValue, page: number) {
  const search = new URLSearchParams();
  if (eventFilter !== "all") {
    search.set("event", eventFilter);
  }
  if (emailFilter !== "all") {
    search.set("email", emailFilter);
  }
  if (page > 1) {
    search.set("page", String(page));
  }

  const query = search.toString();
  return query ? `/dashboard/notifications?${query}` : "/dashboard/notifications";
}

function eventLabel(eventType: string) {
  if (eventType === "document_uploaded") {
    return "Documento cargado";
  }
  if (eventType === "document_approved") {
    return "Documento aprobado";
  }
  if (eventType === "document_rejected") {
    return "Documento rechazado";
  }
  if (eventType === "document_download_requested") {
    return "Solicitud de descarga";
  }

  return eventType;
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
}

function formatDateCompact(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  const timeLabel = new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  if (diffDays === 0) {
    return `Hoy · ${timeLabel}`;
  }

  if (diffDays === 1) {
    return `Ayer · ${timeLabel}`;
  }

  const dateLabel = new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(date);

  return `${dateLabel} · ${timeLabel}`;
}

function asPayloadRecord(payload: unknown): NotificationPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  return payload as Record<string, unknown>;
}

function getPayloadField(payload: NotificationPayload, key: string) {
  if (!payload) {
    return "";
  }

  const value = payload[key];

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function formatFieldLabel(key: string) {
  if (key === "fileName") return "Archivo";
  if (key === "status") return "Estado";
  if (key === "decision") return "Decision";
  if (key === "folderType") return "Carpeta";
  if (key === "workerId") return "Trabajador";
  if (key === "documentId") return "Documento";
  if (key === "rejectionReason") return "Motivo";
  if (key === "requestedBy") return "Solicitado por";

  return key;
}

function formatPayloadValue(key: string, value: string) {
  if (key === "folderType") {
    const folderType = value as (typeof folderTypes)[number];
    return folderLabels[folderType] ?? value;
  }

  return value;
}

function truncateMiddle(value: string, start = 8, end = 6) {
  if (!value || value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function getPayloadSummary(payloadValue: unknown) {
  const payload = asPayloadRecord(payloadValue);
  const orderedKeys = [
    "fileName",
    "status",
    "decision",
    "folderType",
    "workerId",
    "documentId",
    "rejectionReason",
    "requestedBy",
  ] as const;

  return orderedKeys
    .map((key) => ({ key, value: getPayloadField(payload, key) }))
    .filter((item) => item.value && item.value !== "null");
}

function PayloadPreview({ payloadValue }: { payloadValue: unknown }) {
  const summary = getPayloadSummary(payloadValue);

  if (!summary.length) {
    return <p className="text-xs text-slate-500">Sin resumen disponible.</p>;
  }

  return (
    <div className="space-y-1.5">
      {summary.slice(0, 2).map(({ key, value }) => (
        <div key={key} className="grid grid-cols-[minmax(0,72px)_minmax(0,1fr)] items-start gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {formatFieldLabel(key)}
          </p>
          <p
            className={
              key.endsWith("Id")
                ? "truncate font-mono text-xs text-slate-700"
                : "truncate text-xs text-slate-700"
            }
            title={formatPayloadValue(key, value)}
          >
            {formatPayloadValue(key, value)}
          </p>
        </div>
      ))}
      {summary.length > 2 ? (
        <p className="text-[11px] text-slate-500">+{summary.length - 2} campos mas</p>
      ) : null}
    </div>
  );
}

function EmailStatusBadge({ sentAt }: { sentAt: string | null }) {
  if (!sentAt) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
        No enviado
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        Enviado
      </span>
      <p className="text-xs text-slate-600">{formatDate(sentAt)}</p>
    </div>
  );
}

function PayloadSummary({ payloadValue }: { payloadValue: unknown }) {
  const summary = getPayloadSummary(payloadValue);

  if (!summary.length) {
    return <p className="text-xs text-slate-500">Sin payload estructurado.</p>;
  }

  return (
    <dl className="space-y-1.5">
      {summary.map(({ key, value }) => (
        <div key={key} className="grid grid-cols-[minmax(0,80px)_minmax(0,1fr)] items-start gap-2">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {formatFieldLabel(key)}
          </dt>
          <dd
            className={
              key.endsWith("Id")
                ? "break-all font-mono text-xs text-slate-700"
                : "break-words text-xs text-slate-700"
            }
          >
            {formatPayloadValue(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PayloadDetailButton({
  eventType,
  createdAt,
  userId,
  payloadValue,
  triggerLabel = "Ver detalle",
}: {
  eventType: string;
  createdAt: string;
  userId: string;
  payloadValue: unknown;
  triggerLabel?: string;
}) {
  return (
    <ModalButton
      triggerLabel={triggerLabel}
      title={eventLabel(eventType)}
      description={`${formatDate(createdAt)} · ${userId}`}
      className="w-full sm:w-auto"
    >
      <div className="space-y-4">
        <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Resumen completo
          </p>
          <div className="mt-3">
            <PayloadSummary payloadValue={payloadValue} />
          </div>
        </section>

        {payloadValue ? (
          <section className="rounded-md border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Payload JSON
              </p>
            </div>
            <pre className="max-h-80 overflow-auto px-4 py-3 text-xs text-slate-700">
              {JSON.stringify(payloadValue, null, 2)}
            </pre>
          </section>
        ) : null}
      </div>
    </ModalButton>
  );
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const urlParams = await searchParams;
  const eventFilter = getEventFilter(urlParams.event);
  const emailFilter = getEmailFilter(urlParams.email);
  const currentPage = getPageParam(urlParams.page);
  const pageFrom = (currentPage - 1) * NOTIFICATIONS_PAGE_SIZE;
  const pageTo = pageFrom + NOTIFICATIONS_PAGE_SIZE - 1;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canViewAudit(profile?.role)) {
    redirect("/dashboard?error=No+tienes+permisos+para+ver+notificaciones");
  }

  let query = supabase
    .from("notifications")
    .select("id, user_id, event_type, payload, sent_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(pageFrom, pageTo);

  if (eventFilter !== "all") {
    query = query.eq("event_type", eventFilter);
  }

  if (emailFilter === "sent") {
    query = query.not("sent_at", "is", null);
  }

  if (emailFilter === "pending") {
    query = query.is("sent_at", null);
  }

  const { data: notifications, error, count } = await query;
  const notificationRows = notifications ?? [];
  const totalNotificationsCount = count ?? 0;

  if (!error && currentPage > 1 && notificationRows.length === 0 && totalNotificationsCount > 0) {
    const lastPage = Math.max(1, Math.ceil(totalNotificationsCount / NOTIFICATIONS_PAGE_SIZE));
    redirect(buildNotificationsPath(eventFilter, emailFilter, lastPage));
  }

  const hasNextPage = !error && currentPage * NOTIFICATIONS_PAGE_SIZE < totalNotificationsCount;
  const previousPageHref =
    currentPage > 1 ? buildNotificationsPath(eventFilter, emailFilter, currentPage - 1) : null;
  const nextPageHref = hasNextPage
    ? buildNotificationsPath(eventFilter, emailFilter, currentPage + 1)
    : null;

  const isAdmin = profile?.role === "admin";
  const successParam = getStringParam(urlParams.success);
  const errorParam = getStringParam(urlParams.error);

  return (
    <section className="space-y-5">
      <FlashMessages
        error={errorParam === "email_test_failed" ? "No se pudo enviar el email de prueba. Revisa la configuracion de Resend." : errorParam}
        success={successParam === "email_test_sent" ? `Email de prueba enviado a ${user.email}. Verifica tu bandeja de entrada.` : successParam}
      />

      {isAdmin ? (
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Verificacion de email
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Envia un email de prueba a{" "}
            <span className="font-medium text-slate-800">{user.email}</span> para
            verificar que el servicio de Resend esta funcionando.
          </p>
          <form action={sendTestEmailAction} className="mt-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              Enviar email de prueba
            </button>
          </form>
        </div>
      ) : null}

      <header className="rounded-xl bg-white p-6 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sistema</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Notificaciones</h1>
            <p className="mt-1 text-sm text-slate-500">
              Eventos documentales y estado de envio de email.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Volver al dashboard
          </Link>
        </div>
        {!error ? (
          <>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <span className="inline-flex items-center rounded bg-slate-100/70 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                {notificationRows.length} en esta pagina
              </span>
              <span className="inline-flex items-center rounded bg-slate-100/70 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                {totalNotificationsCount} total
              </span>
              {eventFilter !== "all" ? (
                <span className="inline-flex items-center rounded bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  Evento: {eventLabel(eventFilter)}
                </span>
              ) : null}
              {emailFilter !== "all" ? (
                <span className="inline-flex items-center rounded bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  Email: {emailFilter === "sent" ? "Enviado" : "No enviado"}
                </span>
              ) : null}
            </div>

            <form className="mt-4 grid gap-3 rounded-lg bg-[#f7f7f5] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="space-y-1.5">
                <label htmlFor="filter-event" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Evento
                </label>
                <select
                  id="filter-event"
                  name="event"
                  defaultValue={eventFilter}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                >
                  <option value="all">Todos los eventos</option>
                  {notificationEventOptions.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventLabel(eventType)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="filter-email" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Estado email
                </label>
                <select
                  id="filter-email"
                  name="email"
                  defaultValue={emailFilter}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 focus:ring-2"
                >
                  <option value="all">Todos</option>
                  <option value="pending">No enviado</option>
                  <option value="sent">Enviado</option>
                </select>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
                >
                  Filtrar
                </button>
                <Link
                  href="/dashboard/notifications"
                  className="inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  Limpiar
                </Link>
              </div>
            </form>
          </>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          No se pudieron cargar notificaciones: {error.message}
        </div>
      ) : null}

      {!error && !notificationRows.length ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">No hay notificaciones registradas.</p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando se carguen o revisen documentos, apareceran aqui.
          </p>
        </div>
      ) : null}

      {!error && notificationRows.length ? (
        <>
          <PaginationControls
            currentPage={currentPage}
            previousHref={previousPageHref}
            nextHref={nextPageHref}
            showingCount={notificationRows.length}
            totalCount={totalNotificationsCount}
          />

          <div className="space-y-3 md:hidden">
            {notificationRows.map((notification) => (
              <article
                key={notification.id}
                className="rounded-md border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {eventLabel(notification.event_type)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDateCompact(notification.created_at)}
                    </p>
                  </div>
                  <EmailStatusBadge sentAt={notification.sent_at} />
                </div>

                <div className="mt-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Destino
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-700">{notification.user_id}</p>
                </div>

                <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <PayloadPreview payloadValue={notification.payload} />
                  <PayloadDetailButton
                    eventType={notification.event_type}
                    createdAt={notification.created_at}
                    userId={notification.user_id}
                    payloadValue={notification.payload}
                    triggerLabel="Abrir detalle"
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[14%]" />
                <col className="w-[14%]" />
                <col className="w-[28%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-[#f7f7f5]">
                <tr>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Evento</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Fecha</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Destino</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Resumen</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Email</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notificationRows.map((notification) => (
                  <tr key={notification.id} className="align-top">
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {eventLabel(notification.event_type)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                      <p className="text-xs leading-5 md:text-sm" title={formatDate(notification.created_at)}>
                        {formatDateCompact(notification.created_at)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        title={notification.user_id}
                        className="inline-block max-w-full truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                      >
                        {truncateMiddle(notification.user_id)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                        <PayloadPreview payloadValue={notification.payload} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <EmailStatusBadge sentAt={notification.sent_at} />
                    </td>
                    <td className="px-3 py-3">
                      <PayloadDetailButton
                        eventType={notification.event_type}
                        createdAt={notification.created_at}
                        userId={notification.user_id}
                        payloadValue={notification.payload}
                        triggerLabel="Abrir"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={currentPage}
            previousHref={previousPageHref}
            nextHref={nextPageHref}
            showingCount={notificationRows.length}
            totalCount={totalNotificationsCount}
          />
        </>
      ) : null}
    </section>
  );
}
