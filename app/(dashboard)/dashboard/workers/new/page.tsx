import { redirect } from "next/navigation";

import { canManageWorkers } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { createWorkerAction } from "../actions";
import { WorkerForm } from "../_components/worker-form";

type NewWorkerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export default async function NewWorkerPage({ searchParams }: NewWorkerPageProps) {
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

  const params = await searchParams;

  return (
    <WorkerForm
      title="Nuevo trabajador"
      description="Completa los datos basicos y, si corresponde, crea su acceso a intranet en el mismo paso."
      submitLabel="Crear trabajador"
      action={createWorkerAction}
      errorMessage={getStringParam(params.error)}
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
