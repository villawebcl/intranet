import Link from "next/link";
import { redirect } from "next/navigation";

import { FlashMessages } from "@/components/ui/flash-messages";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { canViewAudit } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/Badge";

type NotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

function truncateMiddle(value: string, start = 8, end = 6) {
  if (!value || value.length <= start + end + 1) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
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

  return (
    <section className="space-y-5">
        <FlashMessages
            error={getStringParam(urlParams.error)}
            success={getStringParam(urlParams.success)}
        />

        <SectionHeader
            title="Notificaciones"
            description="Panel admin de eventos documentales recientes y estado de envio de email."
        />

        <Card>
            <CardHeader>
                <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
                <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="space-y-1.5">
                        <label htmlFor="filter-event" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Evento
                        </label>
                        <select
                        id="filter-event"
                        name="event"
                        defaultValue={eventFilter}
                        className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
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
                        className="w-full rounded-sm border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                        >
                        <option value="all">Todos</option>
                        <option value="pending">No enviado</option>
                        <option value="sent">Enviado</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-2">
                        <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-sm bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                        Filtrar
                        </button>
                        <Link
                        href="/dashboard/notifications"
                        className="inline-flex items-center justify-center rounded-sm border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                        Limpiar
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>

      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          No se pudieron cargar notificaciones: {error.message}
        </div>
      ) : null}

      {!error && !notificationRows.length ? (
        <div className="rounded-sm border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">No hay notificaciones registradas.</p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando se carguen o revisen documentos, apareceran aqui.
          </p>
        </div>
      ) : null}

      {!error && notificationRows.length ? (
        <Card>
            <CardHeader>
                <PaginationControls
                    currentPage={currentPage}
                    previousHref={previousPageHref}
                    nextHref={nextPageHref}
                    showingCount={notificationRows.length}
                    totalCount={totalNotificationsCount}
                />
            </CardHeader>
            <CardContent>
            <div className="hidden overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Evento</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Destino</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Email</th>
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
                        {formatDate(notification.created_at)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        title={notification.user_id}
                        className="inline-block max-w-full truncate rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                      >
                        {truncateMiddle(notification.user_id)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <Badge variant={notification.sent_at ? 'success' : 'secondary'}>
                        {notification.sent_at ? 'Enviado' : 'Pendiente'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
