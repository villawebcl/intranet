import { z } from "zod";

function optionalText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .transform((value) => (value.length ? value : undefined))
    .optional();
}

export const workerFormSchema = z.object({
  rut: z.string().trim().min(3, "El RUT es obligatorio").max(20, "El RUT es demasiado largo"),
  firstName: z
    .string()
    .trim()
    .min(2, "El nombre es obligatorio")
    .max(80, "El nombre es demasiado largo"),
  lastName: z
    .string()
    .trim()
    .min(2, "El apellido es obligatorio")
    .max(80, "El apellido es demasiado largo"),
  position: optionalText(120),
  area: optionalText(120),
  email: z
    .string()
    .trim()
    .email("Correo invalido")
    .transform((value) => value.toLowerCase())
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: optionalText(40),
});

export const toggleWorkerStatusSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  currentStatus: z.enum(["activo", "inactivo"], "Estado invalido"),
  returnTo: z.string().trim().optional(),
});

export const deactivateWorkerSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  confirmArchive: z.literal("yes", "Debes confirmar el archivado"),
  returnTo: z.string().trim().optional(),
});

export const reactivateWorkerSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  returnTo: z.string().trim().optional(),
});

export const deleteWorkerSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  confirmDelete: z.literal("yes", "Debes confirmar la eliminacion definitiva"),
  returnTo: z.string().trim().optional(),
});

export const createWorkerAccessSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  temporaryPassword: z
    .string()
    .min(8, "La contrasena temporal debe tener al menos 8 caracteres")
    .max(128, "La contrasena temporal es demasiado larga"),
  returnTo: z.string().trim().optional(),
});

export const suspendWorkerAccessSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  returnTo: z.string().trim().optional(),
});

export const activateWorkerAccessSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  returnTo: z.string().trim().optional(),
});

export const createMissingWorkerAccessesSchema = z.object({
  confirmCreate: z.literal("yes", "Debes confirmar la creacion masiva de accesos"),
  returnTo: z.string().trim().optional(),
});

export type WorkerFormInput = z.infer<typeof workerFormSchema>;
