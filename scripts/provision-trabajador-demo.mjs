import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
}

const WORKER_SEED = {
  email: process.env.SEED_TRABAJADOR_EMAIL ?? "trabajador@empresa.local",
  password: process.env.SEED_TRABAJADOR_PASSWORD ?? process.env.SEED_USERS_DEFAULT_PASSWORD ?? "Pass123!",
  fullName: process.env.SEED_TRABAJADOR_FULL_NAME ?? "Trabajador Demo",
  rut: process.env.SEED_TRABAJADOR_RUT ?? "99.999.999-8",
  firstName: process.env.SEED_TRABAJADOR_FIRST_NAME ?? "Trabajador",
  lastName: process.env.SEED_TRABAJADOR_LAST_NAME ?? "Demo",
  area: process.env.SEED_TRABAJADOR_AREA ?? "Operaciones",
  position: process.env.SEED_TRABAJADOR_POSITION ?? "Operario",
  phone: process.env.SEED_TRABAJADOR_PHONE ?? "+56 9 0000 0000",
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function getOrCreateAuthUser() {
  const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`No se pudieron listar usuarios auth: ${listError.message}`);
  }

  const existing = usersPage.users.find((user) => user.email?.toLowerCase() === WORKER_SEED.email.toLowerCase());

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: WORKER_SEED.password,
      email_confirm: true,
      user_metadata: {
        full_name: WORKER_SEED.fullName,
        seed_label: "trabajador",
      },
    });

    if (error) {
      throw new Error(`No se pudo actualizar usuario ${WORKER_SEED.email}: ${error.message}`);
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: WORKER_SEED.email,
    password: WORKER_SEED.password,
    email_confirm: true,
    user_metadata: {
      full_name: WORKER_SEED.fullName,
      seed_label: "trabajador",
    },
  });

  if (error) {
    throw new Error(`No se pudo crear usuario ${WORKER_SEED.email}: ${error.message}`);
  }

  return data.user;
}

async function upsertWorkerRow() {
  const { data: existing, error: lookupError } = await supabase
    .from("workers")
    .select("id")
    .eq("rut", WORKER_SEED.rut)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`No se pudo buscar trabajador (${WORKER_SEED.rut}): ${lookupError.message}`);
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("workers")
      .update({
        first_name: WORKER_SEED.firstName,
        last_name: WORKER_SEED.lastName,
        area: WORKER_SEED.area,
        position: WORKER_SEED.position,
        email: WORKER_SEED.email,
        phone: WORKER_SEED.phone,
        status: "activo",
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar ficha trabajador: ${updateError.message}`);
    }

    return existing.id;
  }

  const { data, error } = await supabase
    .from("workers")
    .insert({
      rut: WORKER_SEED.rut,
      first_name: WORKER_SEED.firstName,
      last_name: WORKER_SEED.lastName,
      area: WORKER_SEED.area,
      position: WORKER_SEED.position,
      email: WORKER_SEED.email,
      phone: WORKER_SEED.phone,
      status: "activo",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo crear ficha trabajador: ${error.message}`);
  }

  return data.id;
}

async function schemaSupportsProfileWorkerId() {
  const { error } = await supabase.from("profiles").select("worker_id").limit(1);
  return !error || !error.message.toLowerCase().includes("worker_id");
}

async function upsertProfile(userId, workerId, supportsWorkerId) {
  const payload = {
    id: userId,
    role: "trabajador",
    full_name: WORKER_SEED.fullName,
    ...(supportsWorkerId ? { worker_id: workerId } : {}),
  };

  let { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  let appliedRole = "trabajador";
  const notes = [];

  if (error && error.message.toLowerCase().includes("invalid input value for enum")) {
    const fallback = { ...payload, role: "visitante" };
    const fallbackResult = await supabase.from("profiles").upsert(fallback, { onConflict: "id" });
    error = fallbackResult.error;
    appliedRole = "visitante";
    notes.push("El enum app_role aun no incluye 'trabajador' en tu base remota.");
  }

  if (error) {
    throw new Error(`No se pudo upsert de profile: ${error.message}`);
  }

  if (!supportsWorkerId) {
    notes.push("La columna profiles.worker_id aun no existe en tu base remota.");
  }

  return { appliedRole, notes };
}

async function main() {
  const user = await getOrCreateAuthUser();
  const workerId = await upsertWorkerRow();
  const supportsWorkerId = await schemaSupportsProfileWorkerId();
  const profileResult = await upsertProfile(user.id, workerId, supportsWorkerId);

  console.log("Provision trabajador demo completado");
  console.log(`- auth user: ${WORKER_SEED.email}`);
  console.log(`- password: ${WORKER_SEED.password}`);
  console.log(`- worker rut: ${WORKER_SEED.rut}`);
  console.log(`- worker_id: ${workerId}`);
  console.log(`- profile.role: ${profileResult.appliedRole}`);
  console.log(`- profiles.worker_id soportado: ${supportsWorkerId ? "si" : "no"}`);
  if (profileResult.notes.length) {
    profileResult.notes.forEach((note) => console.log(`- nota: ${note}`));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
