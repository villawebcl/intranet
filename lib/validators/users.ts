import { z } from "zod";

import { appRoles } from "@/lib/constants/domain";

function optionalName(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    },
    z.string().max(maxLength).optional(),
  );
}

export const createUserAdminSchema = z.object({
  email: z.string().trim().email("Correo invalido").transform((value) => value.toLowerCase()),
  fullName: optionalName(120),
  role: z.enum(appRoles, "Rol invalido"),
  password: z
    .string()
    .min(8, "La contrasena debe tener al menos 8 caracteres")
    .max(128, "La contrasena es demasiado larga"),
});

export const updateUserAdminSchema = z.object({
  userId: z.string().uuid("Usuario invalido"),
  fullName: optionalName(120),
  role: z.enum(appRoles, "Rol invalido"),
  returnTo: z.string().trim().optional(),
});

export const resetUserPasswordAdminSchema = z.object({
  userId: z.string().uuid("Usuario invalido"),
  password: z
    .string()
    .min(8, "La contrasena debe tener al menos 8 caracteres")
    .max(128, "La contrasena es demasiado larga"),
  returnTo: z.string().trim().optional(),
});
