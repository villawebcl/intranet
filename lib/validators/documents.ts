import { z } from "zod";

import { folderTypes } from "@/lib/constants/domain";

function optionalFormString(maxLength: number) {
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

export const uploadDocumentSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  folderType: z.enum(folderTypes, "Carpeta invalida"),
  returnTo: optionalFormString(300),
});

export const reviewDocumentSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  documentId: z.string().uuid("Documento invalido"),
  decision: z.enum(["aprobado", "rechazado"], "Decision invalida"),
  rejectionReason: optionalFormString(500),
  returnTo: optionalFormString(300),
});

export const downloadDocumentSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  documentId: z.string().uuid("Documento invalido"),
  returnTo: optionalFormString(300),
});

export const createDownloadRequestSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  documentId: z.string().uuid("Documento invalido"),
  requestReason: z
    .string()
    .trim()
    .min(3, "Debes indicar un motivo")
    .max(500, "El motivo no puede superar 500 caracteres"),
  returnTo: optionalFormString(300),
});

export const resolveDownloadRequestSchema = z.object({
  requestId: z.string().uuid("Solicitud invalida"),
  workerId: z.string().uuid("Trabajador invalido"),
  decision: z.enum(["aprobado", "rechazado"], "Decision invalida"),
  decisionNote: optionalFormString(500),
  returnTo: optionalFormString(300),
});

export const downloadApprovedRequestSchema = z.object({
  requestId: z.string().uuid("Solicitud invalida"),
  workerId: z.string().uuid("Trabajador invalido"),
  returnTo: optionalFormString(300),
});
