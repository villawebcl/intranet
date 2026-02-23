import Link from "next/link";
import { redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type NotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type NotificationPayload = Record<string, unknown> | null;

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

  return eventType;
}

function formatDate(dateValue: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateValue));
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

  return key;
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
  ] as const;

  return orderedKeys
    .map((key) => ({ key, value: getPayloadField(payload, key) }))
    .filter((item) => item.value && item.value !== "null");
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
        <div key={key} className="grid grid-cols-[84px_1fr] items-start gap-2">
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
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function PayloadJsonDetails({ payloadValue }: { payloadValue: unknown }) {
  if (!payloadValue) {
    return null;
  }

  return (
    <details className="group mt-2 rounded-lg border border-slate-200 bg-slate-50">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-700">
        <span className="group-open:hidden">Ver JSON</span>
        <span className="hidden group-open:inline">Ocultar JSON</span>
      </summary>
      <pre className="max-h-48 overflow-auto border-t border-slate-200 px-3 py-2 text-xs text-slate-700">
        {JSON.stringify(payloadValue, null, 2)}
      </pre>
    </details>
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  const canSeeAll = isAdmin || canManageWorkers(profile?.role);

  let query = supabase
    .from("notifications")
    .select("id, user_id, event_type, payload, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!canSeeAll) {
    query = query.eq("user_id", user.id);
  }

  const { data: notifications, error } = await query;
  const notificationRows = notifications ?? [];

  return (
    <section className="space-y-5">
      {getStringParam(urlParams.success) ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {getStringParam(urlParams.success)}
        </p>
      ) : null}
      {getStringParam(urlParams.error) ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {getStringParam(urlParams.error)}
        </p>
      ) : null}

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Notificaciones</h1>
            <p className="mt-1 text-sm text-slate-600">
              {canSeeAll
                ? "Vista operativa de eventos documentales recientes."
                : "Eventos documentales recientes de tu cuenta."}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Volver al dashboard
          </Link>
        </div>
        {!error ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {notificationRows.length} registros
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {canSeeAll ? "Vista general" : "Vista personal"}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          No se pudieron cargar notificaciones: {error.message}
        </div>
      ) : null}

      {!error && !notificationRows.length ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">No hay notificaciones registradas.</p>
          <p className="mt-1 text-sm text-slate-500">
            Cuando se carguen o revisen documentos, apareceran aqui.
          </p>
        </div>
      ) : null}

      {!error && notificationRows.length ? (
        <>
          <div className="space-y-3 md:hidden">
            {notificationRows.map((notification) => (
              <article
                key={notification.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {eventLabel(notification.event_type)}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      {formatDate(notification.created_at)}
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

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <PayloadSummary payloadValue={notification.payload} />
                  <PayloadJsonDetails payloadValue={notification.payload} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Evento</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Destino</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Resumen</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notificationRows.map((notification) => (
                  <tr key={notification.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {eventLabel(notification.event_type)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDate(notification.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        title={notification.user_id}
                        className="inline-block max-w-44 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700"
                      >
                        {truncateMiddle(notification.user_id)}
                      </span>
                    </td>
                    <td className="min-w-[320px] px-4 py-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <PayloadSummary payloadValue={notification.payload} />
                        <PayloadJsonDetails payloadValue={notification.payload} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      <EmailStatusBadge sentAt={notification.sent_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
