import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import FormData = require('form-data');
import axios, { AxiosError } from 'axios';

export interface OcrResult {
  rawValue: string;
  lecturaFinal: number;
  confidence: number;
  usedRed: boolean;
  metadata: object;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  private get ocrEndpoint(): string {
    const endpoint = process.env.OCR_ENDPOINT ?? 'http://localhost:8000/ocr';
    this.logger.debug(`OCR_ENDPOINT resuelto: ${endpoint}`);
    return endpoint;
  }

  /**
   * Procesa OCR a partir de un Buffer en memoria.
   * No escribe a disco — ideal para flujos donde no quieres persistir
   * imágenes que el usuario podría descartar.
   */
  async readMeterFromBuffer(
    buffer: Buffer,
    filename = 'meter.jpg',
  ): Promise<OcrResult> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Buffer de imagen vacío');
    }

    const endpoint = this.ocrEndpoint;
    this.logger.log(`Enviando imagen (${buffer.length} bytes) al servicio OCR: ${endpoint}`);

    const form = new FormData();
    // form-data acepta Buffer directamente. Le indicamos filename y contentType
    // para que el endpoint Python lo trate como un upload normal.
    form.append('file', buffer, {
      filename,
      contentType: 'image/jpeg',
    });

    return this.callOcrEndpoint(form);
  }

  /**
   * Mantenido para retrocompatibilidad. Internamente lee el archivo
   * y delega en readMeterFromBuffer. Se puede ir eliminando cuando
   * todo el código consuma readMeterFromBuffer directamente.
   */
  async readMeter(imagePath: string): Promise<OcrResult> {
    if (!fs.existsSync(imagePath)) {
      throw new BadRequestException(`Imagen no encontrada: ${imagePath}`);
    }
    const buffer = fs.readFileSync(imagePath);
    return this.readMeterFromBuffer(buffer, imagePath);
  }

  // ── Núcleo de la llamada HTTP (compartido por ambos métodos) ──

  private async callOcrEndpoint(form: FormData): Promise<OcrResult> {
    const endpoint = this.ocrEndpoint;
    let rawResponse: any;

    try {
      const response = await axios.post(endpoint, form, {
        headers: { ...form.getHeaders() },
        timeout: 30000,
      });

      rawResponse = response.data;
      this.logger.debug(`Respuesta OCR: ${JSON.stringify(rawResponse)}`);
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.code === 'ECONNREFUSED') {
        this.logger.error(`Conexión rechazada en ${endpoint}`);
        throw new BadRequestException(
          `No se pudo conectar al servicio OCR en ${endpoint}. ` +
          `Verifica que el contenedor esté corriendo: docker compose up -d`
        );
      }

      if (axiosError.response) {
        this.logger.error(`OCR respondió ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
        throw new BadRequestException(`Error del servicio OCR: ${JSON.stringify(axiosError.response.data)}`);
      }

      this.logger.error(`Error inesperado: ${axiosError.message}`);
      throw new BadRequestException(`Error al procesar imagen: ${axiosError.message}`);
    }

    if (!rawResponse.success) {
      throw new BadRequestException(`OCR falló: ${rawResponse.message}`);
    }

    const digitsOnly = rawResponse.digits_only ?? '';
    const lecturaFinal = this.parseReading(digitsOnly);

    this.logger.log(
      `OCR OK — raw="${rawResponse.text}" | digits="${digitsOnly}" | ` +
      `lectura=${lecturaFinal} | confianza=${rawResponse.confidence}%`
    );

    return {
      rawValue: digitsOnly,
      lecturaFinal,
      confidence: rawResponse.confidence ?? 0,
      usedRed: lecturaFinal.toString().endsWith('.999'),
      metadata: rawResponse,
    };
  }

  private parseReading(digits: string): number {
    if (!digits || digits.trim() === '') {
      this.logger.warn('OCR no detectó dígitos — fallback 0.999');
      return 0.999;
    }

    const num = parseFloat(digits);

    if (isNaN(num)) {
      this.logger.warn(`Dígitos no parseables: "${digits}" — fallback .999`);
      const partial = parseInt(digits.replace(/\D/g, ''), 10);
      return isNaN(partial) ? 0.999 : parseFloat(`${partial}.999`);
    }

    return num;
  }
}
