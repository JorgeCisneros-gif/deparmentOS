import {
  Injectable, Logger, BadGatewayException, ServiceUnavailableException,
} from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import * as FormData from 'form-data';
import {
  APP_SOURCE,
  ProviderStatus,
  GatewayHealth,
  UploadFileParams,
  UploadResult,
} from './storage-gateway.types';

/**
 * Cliente HTTP para comunicarse con suite-os-storage.
 *
 * Encapsula:
 * - Configuración del baseURL y API key (desde .env)
 * - Construcción de URLs con appSource fijo a 'departmentos'
 * - Manejo de errores transformándolos en excepciones NestJS adecuadas
 * - Timeouts y reintentos básicos
 *
 * En la Entrega 1 solo usamos los endpoints de lectura.
 * Las operaciones de upload/connect/disconnect vienen en entregas posteriores.
 */
@Injectable()
export class StorageGatewayService {
  private readonly logger = new Logger(StorageGatewayService.name);
  private readonly http: AxiosInstance;
  private readonly enabled: boolean;

  constructor() {
    const baseURL = process.env.STORAGE_GATEWAY_URL;
    const apiKey  = process.env.STORAGE_GATEWAY_API_KEY;

    // Si no está configurado, el módulo queda en modo "disabled"
    // y todos los métodos lanzan ServiceUnavailableException.
    // Esto permite que DepartmentOS arranque incluso sin gateway configurado.
    this.enabled = Boolean(baseURL && apiKey);

    if (!this.enabled) {
      this.logger.warn(
        '⚠️  Storage Gateway no configurado (STORAGE_GATEWAY_URL o STORAGE_GATEWAY_API_KEY ausentes). ' +
        'Los endpoints /storage/* responderán 503 hasta que se configure.',
      );
    } else {
      this.logger.log(`Storage Gateway client → ${baseURL}`);
    }

    this.http = axios.create({
      baseURL,
      timeout: 30000, // 30s — uploads de fotos pueden tardar
      headers: { 'x-api-key': apiKey || '' },
    });
  }

  private assertEnabled(): void {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Storage Gateway no está configurado en este servidor. ' +
        'Contacta al administrador.',
      );
    }
  }

  // ── Health check ──────────────────────────────────────────────

  /**
   * Verifica que el gateway esté reachable y responda.
   * Útil para diagnóstico y para mostrar el estado en la UI.
   */
  async checkHealth(): Promise<GatewayHealth> {
    this.assertEnabled();
    try {
      const { data } = await this.http.get<GatewayHealth>('/health');
      return data;
    } catch (err) {
      return this.handleHealthError(err);
    }
  }

  // ── Estado del provider para una org ──────────────────────────

  /**
   * Devuelve si el grupo tiene Drive conectado y los datos del provider.
   *
   * El gateway responde 200 incluso si no hay nada configurado
   * (en ese caso { configured: false, type: 'internal' }).
   */
  async getProviderStatus(orgId: string): Promise<ProviderStatus> {
    this.assertEnabled();
    try {
      const { data } = await this.http.get<ProviderStatus>(
        `/providers/${orgId}`,
        { params: { appSource: APP_SOURCE } },
      );
      return data;
    } catch (err) {
      throw this.translateError(err, 'consultando estado del provider');
    }
  }

  // ── Upload de archivo ─────────────────────────────────────────
  //
  // No se usa en Entrega 1 pero está implementado para que las
  // siguientes entregas solo tengan que llamarlo. La Entrega 3
  // lo integrará con el confirmFromSession del flujo OCR.

  /**
   * Sube un archivo al gateway. El gateway decide si va al Drive del
   * cliente (si está conectado) o al storage temporal interno.
   *
   * Devuelve la referencia (`fileId`) que debe guardarse en DepartmentOS
   * para luego pedir la URL de descarga.
   */
  async uploadFile(params: UploadFileParams): Promise<UploadResult> {
    this.assertEnabled();

    const form = new FormData();
    form.append('orgId', params.orgId);
    form.append('appSource', APP_SOURCE);
    form.append('entityType', params.entityType);
    if (params.entityId)       form.append('entityId', params.entityId);
    if (params.subFolder)      form.append('subFolder', params.subFolder);
    if (params.customFileName) form.append('customFileName', params.customFileName);

    form.append('file', params.fileBuffer, {
      filename: params.fileName,
      contentType: params.mimeType,
    });

    try {
      const { data } = await this.http.post<UploadResult>('/files/upload', form, {
        headers: { ...form.getHeaders() },
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength:    50 * 1024 * 1024,
      });
      this.logger.log(
        `Archivo subido al gateway: ${data.fileId} (${data.storageType}/${data.status})`,
      );
      return data;
    } catch (err) {
      throw this.translateError(err, 'subiendo archivo');
    }
  }

  /** Obtiene una URL de descarga para un archivo previamente subido. */
  async getDownloadUrl(fileId: string, orgId: string): Promise<string> {
    this.assertEnabled();
    try {
      const { data } = await this.http.get<{ url: string }>(
        `/files/${fileId}/url`,
        { params: { orgId } },
      );
      return data.url;
    } catch (err) {
      throw this.translateError(err, 'obteniendo URL de descarga');
    }
  }

  // ── Helpers de error ──────────────────────────────────────────

  private handleHealthError(err: any): GatewayHealth {
    const axiosErr = err as AxiosError;
    if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ENOTFOUND') {
      return {
        status: 'down',
        message: 'Storage Gateway no está disponible',
      };
    }
    return {
      status: 'degraded',
      message: axiosErr.message || 'Error desconocido al consultar el gateway',
    };
  }

  /**
   * Transforma errores axios en excepciones NestJS adecuadas para el
   * cliente final.  En particular:
   * - ECONNREFUSED / ENOTFOUND → 503 Service Unavailable
   * - Timeouts → 502 Bad Gateway
   * - Errores HTTP del gateway → se propagan con su status original
   */
  private translateError(err: any, context: string): Error {
    const axiosErr = err as AxiosError<any>;

    if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ENOTFOUND') {
      this.logger.error(`Gateway inalcanzable (${context}): ${axiosErr.message}`);
      return new ServiceUnavailableException(
        'El servicio de almacenamiento no está disponible en este momento. ' +
        'Intenta de nuevo en unos minutos.',
      );
    }

    if (axiosErr.code === 'ECONNABORTED') {
      this.logger.error(`Timeout (${context})`);
      return new BadGatewayException(
        'El servicio de almacenamiento tardó demasiado en responder.',
      );
    }

    if (axiosErr.response) {
      const status  = axiosErr.response.status;
      const message = (axiosErr.response.data as any)?.message
                   || (axiosErr.response.data as any)?.error
                   || axiosErr.message;

      this.logger.warn(`Gateway respondió ${status} (${context}): ${message}`);
      return new BadGatewayException(
        `Storage Gateway error (${status}): ${message}`,
      );
    }

    this.logger.error(`Error inesperado (${context}): ${axiosErr.message}`);
    return new BadGatewayException(`Error en storage: ${axiosErr.message}`);
  }

  // ── Utilidad para que otros servicios sepan si está habilitado ──

  /** Para que otros servicios decidan si pueden o no usar el gateway. */
  isEnabled(): boolean {
    return this.enabled;
  }
}
