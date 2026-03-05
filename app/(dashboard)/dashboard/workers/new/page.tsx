import { redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { getFlash } from "@/lib/flash";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { createWorkerAction } from "../actions";
import { WorkerForm } from "../_components/worker-form";

export default async function NewWorkerPage() {
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
    redirect("/dashboard/workers?error=No+tienes+permisos+para+crear+trabajadores");
  }

  const flash = await getFlash();

  return (
    <WorkerForm
      title="Nuevo trabajador"
      description="Completa los datos basicos y, si corresponde, crea su acceso a intranet en el mismo paso."
      submitLabel="Crear trabajador"
      action={createWorkerAction}
      errorMessage={flash.error ?? ""}
      showAccessSetup
      values={{
        rut: "",
        firstName: "",
        lastName: "",
        position: "",
        area: "",
        email: "",
        phone: "",
      }}
    />
  );
}
