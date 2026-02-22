import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import {
  getSmokeUsersSeed,
  getSmokeWorkerSeed,
  smokeFixturesFilePath,
  type SmokeRole,
  type SmokeRuntimeFixtures,
} from "./support/smoke-fixtures";

loadEnvConfig(process.cwd());

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para preparar fixtures E2E de smoke.",
    );
  }

  const usersSeed = getSmokeUsersSeed();
  const workerSeed = getSmokeWorkerSeed();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: usersPage, error: listUsersError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listUsersError) {
    throw new Error(`No se pudo listar usuarios para E2E smoke: ${listUsersError.message}`);
  }

  const runtimeUsers = {} as SmokeRuntimeFixtures["users"];

  for (const role of Object.keys(usersSeed) as SmokeRole[]) {
    const seed = usersSeed[role];
    const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === seed.email.toLowerCase());

    let userId: string;

    if (existingUser) {
      const { data: updatedUser, error: updateUserError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: seed.password,
        email_confirm: true,
        user_metadata: {
          full_name: seed.fullName,
        },
      });

      if (updateUserError) {
        throw new Error(`No se pudo actualizar usuario E2E smoke (${seed.email}): ${updateUserError.message}`);
      }

      userId = updatedUser.user.id;
    } else {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email: seed.email,
        password: seed.password,
        email_confirm: true,
        user_metadata: {
          full_name: seed.fullName,
        },
      });

      if (createUserError) {
        throw new Error(`No se pudo crear usuario E2E smoke (${seed.email}): ${createUserError.message}`);
      }

      userId = createdUser.user.id;
    }

    const { error: profileUpsertError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        role: seed.role,
        full_name: seed.fullName,
      },
      { onConflict: "id" },
    );

    if (profileUpsertError) {
      throw new Error(`No se pudo upsert de profile E2E smoke (${seed.email}): ${profileUpsertError.message}`);
    }

    runtimeUsers[role] = {
      id: userId,
      email: seed.email,
      password: seed.password,
    };
  }

  const { data: existingWorker, error: workerLookupError } = await supabase
    .from("workers")
    .select("id")
    .eq("rut", workerSeed.rut)
    .maybeSingle();

  if (workerLookupError) {
    throw new Error(`No se pudo buscar trabajador E2E smoke (${workerSeed.rut}): ${workerLookupError.message}`);
  }

  let workerId = existingWorker?.id ?? "";

  if (workerId) {
    const { error: workerUpdateError } = await supabase
      .from("workers")
      .update({
        first_name: workerSeed.firstName,
        last_name: workerSeed.lastName,
        status: workerSeed.status,
        area: workerSeed.area,
        position: workerSeed.position,
        email: workerSeed.email,
        phone: workerSeed.phone,
      })
      .eq("id", workerId);

    if (workerUpdateError) {
      throw new Error(`No se pudo actualizar trabajador E2E smoke (${workerSeed.rut}): ${workerUpdateError.message}`);
    }
  } else {
    const { data: insertedWorker, error: workerInsertError } = await supabase
      .from("workers")
      .insert({
        rut: workerSeed.rut,
        first_name: workerSeed.firstName,
        last_name: workerSeed.lastName,
        status: workerSeed.status,
        area: workerSeed.area,
        position: workerSeed.position,
        email: workerSeed.email,
        phone: workerSeed.phone,
      })
      .select("id")
      .single();

    if (workerInsertError) {
      throw new Error(`No se pudo crear trabajador E2E smoke (${workerSeed.rut}): ${workerInsertError.message}`);
    }

    workerId = insertedWorker.id;
  }

  const runtimeFixtures: SmokeRuntimeFixtures = {
    users: runtimeUsers,
    worker: {
      id: workerId,
      rut: workerSeed.rut,
      firstName: workerSeed.firstName,
      lastName: workerSeed.lastName,
      status: workerSeed.status,
    },
  };

  await mkdir(path.dirname(smokeFixturesFilePath), { recursive: true });
  await writeFile(smokeFixturesFilePath, JSON.stringify(runtimeFixtures, null, 2), "utf8");
}
