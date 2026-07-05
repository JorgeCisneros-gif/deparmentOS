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
 */
@Injectable()
export class StorageGatewayService {
  private readonly logger = new Logger(StorageGatewayService.name);
  private readonly http: AxiosInstance;
  private readonly enabled: boolean;

  constructor() {
    const baseURL = process.env.STORAGE_GATEWAY_URL;
    const apiKey  = process.env.STORAGE_GATEWAY_API_KEY;

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
      timeout: 30000,
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

  async checkHealth(): Promise<GatewayHealth> {
    this.assertEnabled();
    try {
      const { data } = await this.http.get<GatewayHealth>('/health');
      return data;
    } catch (err) {
      return this.handleHealthError(err);
    }
  }

  // ── Estado del provider ──────────────────────────────────────

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

  // ── Upload ───────────────────────────────────────────────────

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

  /** URL de descarga (sirve para mostrar en `<a>` pero no siempre en `<img>`). */
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

  /**
   * Descarga los bytes binarios del archivo desde el gateway.
   *
   * Usa el endpoint /internal/files/:id que devuelve directamente
   * el contenido del archivo (no una URL externa). El gateway baja
   * la imagen del Drive con sus credenciales OAuth y la sirve
   * como bytes.
   *
   * Útil para servir imágenes desde el backend cuando el browser
   * no puede cargar las URLs públicas del Drive directamente
   * (hotlink bloqueado, content-type incorrecto, etc.).
   */
  async downloadFileBytes(
    fileId: string,
    orgId: string,
  ): Promise<{ buffer: Buffer; contentType: string; fileName?: string }> {
    this.assertEnabled();
    try {
      const response = await this.http.get(
        `/internal/files/${fileId}`,
        {
          params: { orgId },
          responseType: 'arraybuffer',
          // El internal endpoint puede tardar más por la descarga del Drive
          timeout: 60000,
        },
      );

      const contentType = String(response.headers['content-type'] || 'application/octet-stream');

      // Si el gateway devolvió JSON (típico cuando hay un error pero el endpoint
      // no lo serializa como error), inspeccionarlo para detectarlo.
      if (contentType.includes('application/json')) {
        const text = Buffer.from(response.data).toString('utf-8');
        throw new Error(`Gateway devolvió JSON en lugar de imagen: ${text.slice(0, 200)}`);
      }

      // Extraer filename del header Content-Disposition (si viene)
      let fileName: string | undefined;
      const disp = response.headers['content-disposition']
        ? String(response.headers['content-disposition'])
        : undefined;
      if (disp) {
        const match = /filename\*?=(?:UTF-\d['']*)?["']?([^"';]+)/i.exec(disp);
        if (match) fileName = decodeURIComponent(match[1]);
      }

      return {
        buffer: Buffer.from(response.data),
        contentType,
        fileName,
      };
    } catch (err) {
      throw this.translateError(err, 'descargando bytes del archivo');
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

  isEnabled(): boolean {
    return this.enabled;
  }
}