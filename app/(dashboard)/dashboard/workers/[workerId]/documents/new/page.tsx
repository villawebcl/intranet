import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormSubmitButton } from "@/components/forms/form-submit-button";
import { AlertBanner } from "@/components/ui/alert-banner";
import { canUploadDocuments } from "@/lib/auth/roles";
import { folderLabels, folderTypes } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

import { uploadDocumentAction } from "../actions";

type UploadDocumentPageProps = {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DOCUMENT_MAX_SIZE_MB = 5;

function getStringParam(value: string | string[] | undefined) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

export default async function UploadDocumentPage({ params, searchParams }: UploadDocumentPageProps) {
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

  if (!canUploadDocuments(profile?.role)) {
    redirect(`/dashboard/workers/${workerId}?error=No+tienes+permisos+para+subir+documentos`);
  }

  const { data: worker, error } = await supabase
    .from("workers")
    .select("id, first_name, last_name, status")
    .eq("id", workerId)
    .maybeSingle();

  if (error || !worker) {
    notFound();
  }

  const requestedFolder = getStringParam(urlParams.folder);
  const selectedFolder = folderTypes.includes(requestedFolder as (typeof folderTypes)[number])
    ? (requestedFolder as (typeof folderTypes)[number])
    : folderTypes[0];
  const isWorkerActive = worker.status === "activo";

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Subir documento PDF</h1>
        <p className="mt-1 text-sm text-slate-600">
          Trabajador: {worker.first_name} {worker.last_name}
        </p>
        <p className="mt-1 text-sm text-slate-600">Estado trabajador: {worker.status}</p>
      </header>

      {!isWorkerActive ? (
        <AlertBanner variant="warning">
          Este trabajador esta inactivo. No se permitiran cargas de documento.
        </AlertBanner>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">
          Reglas: solo PDF, tamano maximo {DOCUMENT_MAX_SIZE_MB}MB, estado inicial pendiente.
        </p>

        <form action={uploadDocumentAction} className="mt-4 space-y-4">
          <input type="hidden" name="workerId" value={worker.id} />
          <input type="hidden" name="returnTo" value={`/dashboard/workers/${worker.id}`} />

          <div className="space-y-1.5">
            <label htmlFor="folderType" className="text-sm font-medium text-slate-900">
              Carpeta
            </label>
            <select
              id="folderType"
              name="folderType"
              defaultValue={selectedFolder}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 transition focus:ring-2"
            >
              {folderTypes.map((folderType) => (
                <option key={folderType} value={folderType}>
                  {folderLabels[folderType]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="file" className="text-sm font-medium text-slate-900">
              Archivo PDF
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={!isWorkerActive}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 transition file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:ring-2"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <FormSubmitButton
              pendingLabel="Subiendo..."
              disabled={!isWorkerActive}
              className="bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Subir documento
            </FormSubmitButton>
            <Link
              href={`/dashboard/workers/${worker.id}`}
              className="inline-flex items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </section>
    </section>
  );
}
