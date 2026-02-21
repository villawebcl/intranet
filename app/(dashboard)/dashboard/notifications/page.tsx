import Link from "next/link";
import { redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type NotificationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
      </header>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Evento</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Destino</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Payload</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error ? (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-red-700">
                  No se pudieron cargar notificaciones: {error.message}
                </td>
              </tr>
            ) : null}

            {!error && !notifications?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No hay notificaciones registradas.
                </td>
              </tr>
            ) : null}

            {notifications?.map((notification) => (
              <tr key={notification.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {eventLabel(notification.event_type)}
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDate(notification.created_at)}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{notification.user_id}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <pre className="max-w-72 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(notification.payload, null, 2)}
                  </pre>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {notification.sent_at ? formatDate(notification.sent_at) : "No enviado"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
