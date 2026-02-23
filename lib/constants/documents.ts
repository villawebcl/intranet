export const DOCUMENT_MAX_SIZE_MB = 5;
export const DOCUMENT_MAX_SIZE_BYTES = DOCUMENT_MAX_SIZE_MB * 1024 * 1024;

export const DOCUMENT_FILE_ACCEPT = "application/pdf,.pdf";

// Politica MVP vigente: trabajador inactivo no admite nuevas cargas.
// La lectura/descarga sigue dependiendo del rol y permisos del usuario.
export const BLOCK_UPLOAD_FOR_INACTIVE_WORKERS = true;
