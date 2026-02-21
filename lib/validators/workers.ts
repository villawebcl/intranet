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

export type WorkerFormInput = z.infer<typeof workerFormSchema>;
