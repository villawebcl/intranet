import { z } from "zod";

import { folderTypes } from "@/lib/constants/domain";

export const uploadDocumentSchema = z.object({
  workerId: z.string().uuid("Trabajador invalido"),
  folderType: z.enum(folderTypes, "Carpeta invalida"),
  returnTo: z.string().trim().optional(),
});
