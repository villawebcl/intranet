import { NextResponse } from "next/server";

import { canViewDocuments, isWorkerScopedRole } from "@/lib/auth/roles";
import { folderLabels, type FolderType } from "@/lib/constants/domain";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

type SearchItem = {
  id: string;
  type: "worker" | "document";
  href: string;
  label: string;
  subtitle: string;
  meta?: string;
};

function normalizeQuery(value: string | null) {
  if (!value) return "";
  return value.trim().slice(0, 80);
}

function workerName(firstName: string | null, lastName: string | null) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "Sin nombre";
}

function documentStatusLabel(status: string) {
  if (status === "aprobado") return "Aprobado";
  if (status === "rechazado") return "Rechazado";
  return "Pendiente";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = normalizeQuery(searchParams.get("q"));

  if (q.length < 2) {
    return NextResponse.json({ workers: [], documents: [] });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ workers: [], documents: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, worker_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? "visitante";
  const workers: SearchItem[] = [];
  const documents: SearchItem[] = [];

  if (!isWorkerScopedRole(role)) {
    const { data: workerRows } = await supabase
      .from("workers")
      .select("id, first_name, last_name, rut, status")
      .or(`rut.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .limit(6);

    for (const row of workerRows ?? []) {
      const name = workerName(row.first_name, row.last_name);
      workers.push({
        id: row.id,
        type: "worker",
        href: `/dashboard/workers/${row.id}`,
        label: name,
        subtitle: row.rut ?? "Sin RUT",
        meta: row.status === "activo" ? "Activo" : "Inactivo",
      });
    }
  }

  if (canViewDocuments(role)) {
    let docsQuery = supabase
      .from("documents")
      .select("id, worker_id, file_name, status, folder_type, worker:workers(first_name, last_name)")
      .ilike("file_name", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(6);

    if (isWorkerScopedRole(role) && profile?.worker_id) {
      docsQuery = docsQuery.eq("worker_id", profile.worker_id);
    }

    const { data: docRows } = await docsQuery;

    for (const row of docRows ?? []) {
      const worker = Array.isArray(row.worker) ? row.worker[0] : row.worker;
      const workerLabel = workerName(worker?.first_name ?? null, worker?.last_name ?? null);
      documents.push({
        id: row.id,
        type: "document",
        href: `/dashboard/workers/${row.worker_id}/documents`,
        label: row.file_name,
        subtitle: `${workerLabel} · ${folderLabels[row.folder_type as FolderType] ?? row.folder_type}`,
        meta: documentStatusLabel(row.status),
      });
    }
  }

  return NextResponse.json({ workers, documents });
}
