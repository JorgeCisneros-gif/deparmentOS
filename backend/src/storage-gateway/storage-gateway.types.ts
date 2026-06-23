/**
 * Tipos compartidos para el cliente del Storage Gateway.
 *
 * Estos tipos deben mantenerse alineados con los del proyecto
 * suite-os-storage. Si la API del gateway cambia, actualizar aquí.
 */

/** Identificador de la aplicación cliente para el gateway. */
export const APP_SOURCE = 'departmentos' as const;

/** Tipo de provider configurado para una org. */
export type ProviderType = 'google_drive' | 'internal';

/**
 * Estado del provider configurado para una org en el gateway.
 *
 * Si nunca se conectó Drive, viene { configured: false, type: 'internal' }.
 * Si está conectado, viene con toda la info del provider.
 */
export interface ProviderStatus {
  configured: boolean;
  type: ProviderType;
  connectedEmail?: string;
  rootFolderName?: string;
  isActive?: boolean;
  lastError?: string | null;
  lastErrorAt?: string | null;
  lastSuccessAt?: string | null;
  message?: string;
}

/** Resultado de un upload exitoso al gateway. */
export interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  status: 'stored_external' | 'stored_temporary' | 'pending_retry';
  expiresAt: string | null;
  storageType: ProviderType;
  externalUrl?: string;
}

/** Parámetros para subir un archivo al gateway. */
export interface UploadFileParams {
  orgId: string;
  entityType: string;
  entityId?: string;
  fileBuffer: Buffer;
  fileName: string;     // nombre del archivo (puede incluir o no extensión)
  mimeType: string;
  subFolder?: string;   // subcarpeta dentro de la raíz (ej: 'Lecturas')
  customFileName?: string; // nombre custom sin extensión, opcional
}

/** Estado de salud del gateway. */
export interface GatewayHealth {
  status: 'ok' | 'degraded' | 'down';
  service?: string;
  ts?: string;
  message?: string;
}
