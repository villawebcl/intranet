import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import { getSmokeAdminCredentials, SMOKE_ADMIN_FULL_NAME } from "./support/smoke-user";

loadEnvConfig(process.cwd());

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para preparar el usuario E2E de smoke.",
    );
  }

  const { email, password } = getSmokeAdminCredentials();
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

  const existingUser = usersPage.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

  let userId: string;

  if (existingUser) {
    const { data: updatedUser, error: updateUserError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        full_name: SMOKE_ADMIN_FULL_NAME,
      },
    });

    if (updateUserError) {
      throw new Error(`No se pudo actualizar usuario E2E smoke (${email}): ${updateUserError.message}`);
    }

    userId = updatedUser.user.id;
  } else {
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: SMOKE_ADMIN_FULL_NAME,
      },
    });

    if (createUserError) {
      throw new Error(`No se pudo crear usuario E2E smoke (${email}): ${createUserError.message}`);
    }

    userId = createdUser.user.id;
  }

  const { error: profileUpsertError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role: "admin",
      full_name: SMOKE_ADMIN_FULL_NAME,
    },
    { onConflict: "id" },
  );

  if (profileUpsertError) {
    throw new Error(`No se pudo upsert de profile E2E smoke (${email}): ${profileUpsertError.message}`);
  }
}
