import { folderLabels, type FolderType } from "@/lib/constants/domain";

type UploadedEmailParams = {
  fileName: string;
  workerName: string;
  folderType: FolderType;
};

type ReviewedEmailParams = {
  fileName: string;
  workerName: string;
  folderType: FolderType;
  decision: "aprobado" | "rechazado";
  rejectionReason?: string | null;
};

export function buildDocumentUploadedEmail(params: UploadedEmailParams) {
  const folderLabel = folderLabels[params.folderType];

  return {
    subject: `Documento cargado: ${params.fileName}`,
    html: `
      <p>Se cargó un nuevo documento en la intranet.</p>
      <ul>
        <li><strong>Archivo:</strong> ${params.fileName}</li>
        <li><strong>Trabajador:</strong> ${params.workerName}</li>
        <li><strong>Carpeta:</strong> ${folderLabel}</li>
        <li><strong>Estado inicial:</strong> pendiente</li>
      </ul>
    `,
  };
}

export function buildDocumentReviewedEmail(params: ReviewedEmailParams) {
  const folderLabel = folderLabels[params.folderType];
  const rejectionDetail =
    params.decision === "rechazado" && params.rejectionReason
      ? `<p><strong>Motivo de rechazo:</strong> ${params.rejectionReason}</p>`
      : "";

  return {
    subject:
      params.decision === "aprobado"
        ? `Documento aprobado: ${params.fileName}`
        : `Documento rechazado: ${params.fileName}`,
    html: `
      <p>Se actualizó la revisión de un documento en la intranet.</p>
      <ul>
        <li><strong>Archivo:</strong> ${params.fileName}</li>
        <li><strong>Trabajador:</strong> ${params.workerName}</li>
        <li><strong>Carpeta:</strong> ${folderLabel}</li>
        <li><strong>Nuevo estado:</strong> ${params.decision}</li>
      </ul>
      ${rejectionDetail}
    `,
  };
}
