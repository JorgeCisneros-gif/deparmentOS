import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as FormData from 'form-data';
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

  async readMeter(imagePath: string): Promise<OcrResult> {
    if (!fs.existsSync(imagePath)) {
      throw new BadRequestException(`Imagen no encontrada: ${imagePath}`);
    }

    const endpoint = this.ocrEndpoint;
    this.logger.log(`Enviando imagen al servicio OCR: ${endpoint}`);

    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    let rawResponse: any;

    try {
      const response = await axios.post(endpoint, form, {
        headers: {
          ...form.getHeaders(),
        },
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
