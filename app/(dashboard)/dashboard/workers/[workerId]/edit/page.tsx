import { notFound, redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { getFlash } from "@/lib/flash";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { updateWorkerAction } from "../../actions";
import { WorkerForm } from "../../_components/worker-form";

type WorkerEditPageProps = {
  params: Promise<{ workerId: string }>;
};

export default async function WorkerEditPage({ params }: WorkerEditPageProps) {
  const { workerId } = await params;
  const flash = await getFlash();

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
      errorMessage={flash.error ?? ""}
      successMessage={flash.success ?? ""}
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
