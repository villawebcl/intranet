import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const args = new Set(process.argv.slice(2));
const shouldRun = args.has("--yes");
const isDryRun = args.has("--dry-run");

if (!shouldRun && !isDryRun) {
  console.error(
    "Uso: node scripts/reset-supabase-users.mjs --yes [--dry-run]\n" +
      "Este script elimina todos los usuarios de Supabase Auth y crea cuentas demo nuevas.",
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
}

const DEFAULT_PASSWORD = process.env.SEED_USERS_DEFAULT_PASSWORD ?? "Pass123!";
const TRABAJADOR_DEMO = {
  rut: process.env.SEED_TRABAJADOR_RUT ?? "99.999.999-8",
  firstName: process.env.SEED_TRABAJADOR_FIRST_NAME ?? "Trabajador",
  lastName: process.env.SEED_TRABAJADOR_LAST_NAME ?? "Demo",
  status: "activo",
  area: process.env.SEED_TRABAJADOR_AREA ?? "Operaciones",
  position: process.env.SEED_TRABAJADOR_POSITION ?? "Operario",
  email: process.env.SEED_TRABAJADOR_EMAIL ?? "trabajador@empresa.local",
  phone: process.env.SEED_TRABAJADOR_PHONE ?? "+56 9 0000 0000",
};

const USERS_TO_CREATE = [
  {
    label: "admin",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@empresa.local",
    fullName: "Administrador Demo",
    role: "admin",
  },
  {
    label: "rrhh",
    email: process.env.SEED_RRHH_EMAIL ?? "rrhh@empresa.local",
    fullName: "RRHH Demo",
    role: "rrhh",
  },
  {
    label: "contabilidad",
    email: process.env.SEED_CONTABILIDAD_EMAIL ?? "contabilidad@empresa.local",
    fullName: "Contabilidad Demo",
    role: "contabilidad",
  },
  {
    label: "trabajador",
    email: process.env.SEED_TRABAJADOR_EMAIL ?? "trabajador@empresa.local",
    fullName: "Trabajador Demo",
    role: "trabajador",
  },
  {
    label: "visitante",
    email: process.env.SEED_VISITANTE_EMAIL ?? "visitante@empresa.local",
    fullName: "Visitante Demo",
    role: "visitante",
  },
];

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllAuthUsers() {
  const allUsers = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new Error(`No se pudieron listar usuarios (page ${page}): ${error.message}`);
    }

    const users = data?.users ?? [];
    allUsers.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

async function clearForeignKeyReferences(userIds) {
  if (userIds.length === 0) return;

  const updates = [
    supabase.from("audit_logs").update({ actor_user_id: null }).in("actor_user_id", userIds),
    supabase.from("workers").update({ created_by: null }).in("created_by", userIds),
    supabase.from("workers").update({ updated_by: null }).in("updated_by", userIds),
    supabase.from("documents").update({ uploaded_by: null }).in("uploaded_by", userIds),
    supabase.from("documents").update({ reviewed_by: null }).in("reviewed_by", userIds),
    supabase.from("notifications").update({ created_by: null }).in("created_by", userIds),
  ];

  const results = await Promise.all(updates);
  const labels = [
    "audit_logs.actor_user_id",
    "workers.created_by",
    "workers.updated_by",
    "documents.uploaded_by",
    "documents.reviewed_by",
    "notifications.created_by",
  ];

  results.forEach((result, index) => {
    if (result.error) {
      throw new Error(`No se pudo limpiar FK ${labels[index]}: ${result.error.message}`);
    }
  });
}

async function deleteAllAuthUsers(users) {
  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) {
      const email = user.email ?? user.id;
      throw new Error(`No se pudo eliminar usuario ${email}: ${error.message}`);
    }
  }
}

async function detectSchemaCapabilities() {
  const { error: workerIdColumnError } = await supabase.from("profiles").select("worker_id").limit(1);
  const supportsProfileWorkerId =
    !workerIdColumnError || !workerIdColumnError.message.toLowerCase().includes("worker_id");

  return {
    supportsProfileWorkerId,
  };
}

async function upsertTrabajadorWorker() {
  const { data: existingWorker, error: lookupError } = await supabase
    .from("workers")
    .select("id")
    .eq("rut", TRABAJADOR_DEMO.rut)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo buscar trabajador demo (${TRABAJADOR_DEMO.rut}): ${lookupError.message}`);
  }

  if (existingWorker?.id) {
    const { error: updateError } = await supabase
      .from("workers")
      .update({
        first_name: TRABAJADOR_DEMO.firstName,
        last_name: TRABAJADOR_DEMO.lastName,
        status: TRABAJADOR_DEMO.status,
        area: TRABAJADOR_DEMO.area,
        position: TRABAJADOR_DEMO.position,
        email: TRABAJADOR_DEMO.email,
        phone: TRABAJADOR_DEMO.phone,
      })
      .eq("id", existingWorker.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar trabajador demo: ${updateError.message}`);
    }

    return existingWorker.id;
  }

  const { data: insertedWorker, error: insertError } = await supabase
    .from("workers")
    .insert({
      rut: TRABAJADOR_DEMO.rut,
      first_name: TRABAJADOR_DEMO.firstName,
      last_name: TRABAJADOR_DEMO.lastName,
      status: TRABAJADOR_DEMO.status,
      area: TRABAJADOR_DEMO.area,
      position: TRABAJADOR_DEMO.position,
      email: TRABAJADOR_DEMO.email,
      phone: TRABAJADOR_DEMO.phone,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`No se pudo crear trabajador demo: ${insertError.message}`);
  }

  return insertedWorker.id;
}

async function createTemplateUsers() {
  const created = [];
  const capabilities = await detectSchemaCapabilities();
  let trabajadorWorkerId = null;

  for (const seed of USERS_TO_CREATE) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: seed.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: seed.fullName,
        seed_label: seed.label,
      },
    });

    if (error) {
      throw new Error(`No se pudo crear usuario ${seed.email}: ${error.message}`);
    }

    const userId = data.user?.id;

    if (!userId) {
      throw new Error(`Supabase no devolvio ID para ${seed.email}`);
    }

    if (seed.label === "trabajador") {
      trabajadorWorkerId = await upsertTrabajadorWorker();
    }

    const profilePayload = {
      id: userId,
      role: seed.role,
      full_name: seed.fullName,
      ...(seed.label === "trabajador" && capabilities.supportsProfileWorkerId && trabajadorWorkerId
        ? { worker_id: trabajadorWorkerId }
        : {}),
    };

    let { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });

    let appliedRole = seed.role;
    let note = seed.note;

    if (
      profileError &&
      seed.label === "trabajador" &&
      profileError.message.toLowerCase().includes("invalid input value for enum")
    ) {
      const fallbackPayload = {
        ...profilePayload,
        role: "visitante",
      };
      const fallbackResult = await supabase.from("profiles").upsert(fallbackPayload, { onConflict: "id" });
      profileError = fallbackResult.error;
      appliedRole = "visitante";
      note = "El esquema actual aun no tiene rol 'trabajador'; se creo temporalmente como 'visitante'.";
    }

    if (profileError) {
      throw new Error(`No se pudo crear profile ${seed.email}: ${profileError.message}`);
    }

    if (seed.label === "trabajador" && !capabilities.supportsProfileWorkerId) {
      note = [
        note,
        "El esquema actual no tiene profiles.worker_id; aplica la migracion 20260226_000005 para vincularlo a su ficha.",
      ]
        .filter(Boolean)
        .join(" ");
    }

    created.push({
      label: seed.label,
      email: seed.email,
      role: appliedRole,
      note,
      workerId: seed.label === "trabajador" ? trabajadorWorkerId : null,
    });
  }

  return created;
}

async function main() {
  const existingUsers = await listAllAuthUsers();
  const userIds = existingUsers.map((user) => user.id);

  console.log(`Usuarios actuales en auth: ${existingUsers.length}`);
  existingUsers.forEach((user) => {
    console.log(`- ${user.email ?? "(sin email)"} (${user.id})`);
  });

  console.log("");
  console.log(`Usuarios plantilla a crear: ${USERS_TO_CREATE.length}`);
  USERS_TO_CREATE.forEach((user) => {
    console.log(`- ${user.label}: ${user.email} [profile.role=${user.role}]`);
  });
  console.log(`Trabajador demo (ficha): ${TRABAJADOR_DEMO.rut} / ${TRABAJADOR_DEMO.email}`);
  console.log(`Password por defecto: ${DEFAULT_PASSWORD}`);

  if (isDryRun) {
    console.log("");
    console.log("Dry-run: no se realizaron cambios.");
    return;
  }

  console.log("");
  console.log("Limpiando referencias FK a auth.users...");
  await clearForeignKeyReferences(userIds);

  console.log("Eliminando usuarios existentes...");
  await deleteAllAuthUsers(existingUsers);

  console.log("Creando usuarios plantilla...");
  const created = await createTemplateUsers();

  console.log("");
  console.log("Proceso completado. Usuarios creados:");
  created.forEach((user) => {
    console.log(`- ${user.label}: ${user.email} (role=${user.role})`);
    if (user.workerId) {
      console.log(`  worker_id: ${user.workerId}`);
    }
    if (user.note) {
      console.log(`  nota: ${user.note}`);
    }
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
