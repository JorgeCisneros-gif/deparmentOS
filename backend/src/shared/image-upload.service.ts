// src/shared/image-upload.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadedImageResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  fileSizeKb: number;
  filepath: string;
}

export interface SaveImageOptions {
  subdir?: string;          // subdirectorio dentro de uploads/
  maxSizeMb?: number;       // límite de tamaño (default: 10MB)
  allowedMimes?: string[];  // tipos permitidos (default: jpg, png, webp)
}

const DEFAULT_ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const BASE_UPLOAD_DIR = process.env.UPLOAD_BASE_DIR || './uploads';

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);

  // ── Parsear multipart/form-data con req.parts() (Fastify) ─────
  // Devuelve campos de texto + el archivo de imagen
  async parseMultipart(req: any, opts?: SaveImageOptions): Promise<{
    fields: Record<string, string>;
    image: UploadedImageResult;
  }> {
    const maxBytes = (opts?.maxSizeMb ?? 10) * 1024 * 1024;
    const allowed  = opts?.allowedMimes ?? DEFAULT_ALLOWED;

    const fields: Record<string, string> = {};
    let fileBuffer: Buffer | null = null;
    let originalName = 'imagen.jpg';
    let mimeType = 'image/jpeg';

    try {
      const parts = req.parts();
      for await (const part of parts) {
        if (part.file) {
          fileBuffer   = await part.toBuffer();
          originalName = part.filename || 'imagen.jpg';
          mimeType     = part.mimetype || 'image/jpeg';
        } else {
          fields[part.fieldname] = (part.value as string)?.trim() || '';
        }
      }
    } catch (err) {
      throw new BadRequestException(`Error procesando formulario: ${err.message}`);
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException('Se requiere una imagen');
    }
    if (fileBuffer.length > maxBytes) {
      throw new BadRequestException(
        `Imagen demasiado grande. Máximo ${opts?.maxSizeMb ?? 10}MB`,
      );
    }
    if (!allowed.includes(mimeType.toLowerCase())) {
      throw new BadRequestException(
        `Tipo no permitido: ${mimeType}. Use: ${allowed.join(', ')}`,
      );
    }

    const fileSizeKb = Math.round(fileBuffer.length / 1024);

    return {
      fields,
      image: {
        buffer: fileBuffer,
        filename: originalName,
        mimeType,
        fileSizeKb,
        filepath: '', // se asigna al guardar
      },
    };
  }

  // ── Guardar buffer en disco ────────────────────────────────────
  saveBuffer(
    buffer: Buffer,
    originalName: string,
    prefix: string,
    opts?: SaveImageOptions,
  ): string {
    const subdir  = opts?.subdir ?? 'misc';
    const dir     = path.join(BASE_UPLOAD_DIR, subdir);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ext      = path.extname(originalName) || '.jpg';
    const safeName = `${prefix}_${Date.now()}${ext}`;
    const filepath = path.join(dir, safeName);

    fs.writeFileSync(filepath, buffer);
    this.logger.log(`Imagen guardada: ${filepath}`);
    return filepath;
  }

  // ── Guardar desde base64 (fallback para clientes que no soporten multipart) ─
  saveBase64(
    base64: string,
    originalName: string,
    prefix: string,
    opts?: SaveImageOptions,
  ): string {
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(data, 'base64');
    return this.saveBuffer(buffer, originalName, prefix, opts);
  }

  // ── Eliminar archivo si existe ────────────────────────────────
  deleteIfExists(filepath: string): void {
    if (filepath && fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      this.logger.log(`Imagen eliminada: ${filepath}`);
    }
  }
}
