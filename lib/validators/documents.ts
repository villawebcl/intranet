import { z } from "zod";

import { folderTypes } from "@/lib/constants/domain";

export const uploadDocumentSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  folderType: z.enum(folderTypes, "Carpeta invalida"),
  returnTo: z.string().trim().optional(),
});

export const reviewDocumentSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  documentId: z.string().uuid("Documento invalido"),
  decision: z.enum(["aprobado", "rechazado"], "Decision invalida"),
  rejectionReason: z.string().trim().max(500, "Motivo demasiado largo").optional(),
  returnTo: z.string().trim().optional(),
});

export const downloadDocumentSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  documentId: z.string().uuid("Documento invalido"),
  returnTo: z.string().trim().optional(),
});
