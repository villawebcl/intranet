import { notFound, redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { updateWorkerAction } from "../../actions";
import { WorkerForm } from "../../_components/worker-form";

type WorkerEditPageProps = {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export default async function WorkerEditPage({ params, searchParams }: WorkerEditPageProps) {
  const { workerId } = await params;
  const urlParams = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!canManageWorkers(profile?.role)) {
    redirect("/dashboard/workers?error=No+tienes+permisos+para+editar+trabajadores");
  }

  const { data: worker, error } = await supabase
    .from("workers")
    .select("id, rut, first_name, last_name, position, area, email, phone, is_active")
    .eq("id", workerId)
    .maybeSingle();

  if (error || !worker) {
    notFound();
  }

  if (!worker.is_active) {
    redirect("/dashboard/workers?error=No+puedes+editar+un+trabajador+archivado");
  }

  const boundUpdateAction = updateWorkerAction.bind(null, worker.id);

  return (
    <WorkerForm
      title="Editar trabajador"
      description="Actualiza datos de contacto o identificacion del trabajador."
      submitLabel="Guardar cambios"
      action={boundUpdateAction}
      errorMessage={getStringParam(urlParams.error)}
      successMessage={getStringParam(urlParams.success)}
      values={{
        rut: worker.rut,
        firstName: worker.first_name,
        lastName: worker.last_name,
        position: worker.position ?? "",
        area: worker.area ?? "",
        email: worker.email ?? "",
        phone: worker.phone ?? "",
      }}
    />
  );
}
