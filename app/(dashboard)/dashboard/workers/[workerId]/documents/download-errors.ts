export function getApprovedDownloadErrorMessage(rawError: string) {
  if (
    rawError === "Solicitud aprobada no encontrada" ||
    rawError === "La solicitud aun no esta aprobada" ||
    rawError === "Documento no encontrado"
  ) {
    return "El enlace expiro, genera uno nuevo";
  }

  return rawError;
}
