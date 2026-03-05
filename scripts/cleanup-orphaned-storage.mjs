/**
 * cleanup-orphaned-storage.mjs
 *
 * Detecta (y opcionalmente elimina) archivos en el bucket `documents` de Supabase
 * Storage que no tienen un registro correspondiente en la tabla `documents`.
 *
 * Estos archivos huerfanos pueden generarse cuando un upload a Storage tiene exito
 * pero el INSERT en la tabla documents falla (crash de proceso, timeout, etc.).
 *
 * Uso:
 *   node scripts/cleanup-orphaned-storage.mjs           # solo reportar
 *   node scripts/cleanup-orphaned-storage.mjs --delete  # reportar y eliminar
 *
 * Requiere en el entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const DRY_RUN = !process.argv.includes("--delete");
const BUCKET = "documents";
const STORAGE_PAGE_SIZE = 100;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllStorageFiles() {
  const files = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      limit: STORAGE_PAGE_SIZE,
      offset,
    });

    if (error) {
      console.error("Storage list error:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    // Recursively list subfolders (workerId/folderType/filename structure)
    for (const item of data) {
      if (item.id === null) {
        // It's a folder prefix — list its contents
        const subFiles = await listFolderRecursive(item.name);
        files.push(...subFiles);
      } else {
        files.push(item.name);
      }
    }

    if (data.length < STORAGE_PAGE_SIZE) break;
    offset += STORAGE_PAGE_SIZE;
  }

  return files;
}

async function listFolderRecursive(prefix, depth = 0) {
  if (depth > 3) return []; // safety limit for unexpected deep nesting

  const files = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: STORAGE_PAGE_SIZE,
      offset,
    });

    if (error) {
      console.error(`Storage list error for prefix '${prefix}':`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = `${prefix}/${item.name}`;
      if (item.id === null) {
        const subFiles = await listFolderRecursive(fullPath, depth + 1);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }

    if (data.length < STORAGE_PAGE_SIZE) break;
    offset += STORAGE_PAGE_SIZE;
  }

  return files;
}

async function getKnownFilePaths() {
  const paths = new Set();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("documents")
      .select("file_path")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Documents query error:", error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    data.forEach((row) => paths.add(row.file_path));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return paths;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (use --delete to remove files)" : "DELETE"}`);
  console.log("Scanning storage bucket...");

  const [storageFiles, knownPaths] = await Promise.all([
    listAllStorageFiles(),
    getKnownFilePaths(),
  ]);

  console.log(`Storage files found: ${storageFiles.length}`);
  console.log(`DB document records: ${knownPaths.size}`);

  const orphans = storageFiles.filter((path) => !knownPaths.has(path));

  if (orphans.length === 0) {
    console.log("No orphaned files found.");
    return;
  }

  console.log(`\nOrphaned files (${orphans.length}):`);
  orphans.forEach((path) => console.log(`  - ${path}`));

  if (DRY_RUN) {
    console.log("\nRun with --delete to remove them.");
    return;
  }

  console.log("\nDeleting orphaned files...");
  const { error } = await supabase.storage.from(BUCKET).remove(orphans);

  if (error) {
    console.error("Delete error:", error.message);
    process.exit(1);
  }

  console.log(`Deleted ${orphans.length} orphaned file(s).`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
