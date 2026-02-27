import { expect, test } from "@playwright/test";

import { getApprovedDownloadErrorMessage } from "../../app/(dashboard)/dashboard/workers/[workerId]/documents/download-errors";

test("muestra mensaje claro cuando el enlace aprobado ya no esta disponible", () => {
  expect(getApprovedDownloadErrorMessage("Solicitud aprobada no encontrada")).toBe(
    "El enlace expiro, genera uno nuevo",
  );
  expect(getApprovedDownloadErrorMessage("La solicitud aun no esta aprobada")).toBe(
    "El enlace expiro, genera uno nuevo",
  );
  expect(getApprovedDownloadErrorMessage("Documento no encontrado")).toBe(
    "El enlace expiro, genera uno nuevo",
  );
});

test("mantiene mensaje original para errores no relacionados a expiracion", () => {
  expect(getApprovedDownloadErrorMessage("No tienes permisos para usar enlaces aprobados")).toBe(
    "No tienes permisos para usar enlaces aprobados",
  );
});
