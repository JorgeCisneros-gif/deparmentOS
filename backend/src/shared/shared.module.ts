// src/shared/shared.module.ts
import { Module, Global } from '@nestjs/common';
import { ImageUploadService } from './image-upload.service';
import { TimezoneService } from './timezone.service';

@Global()  // disponible en toda la app sin importar en cada módulo
@Module({
  providers: [ImageUploadService, TimezoneService],
  exports:   [ImageUploadService, TimezoneService],
})
export class SharedModule {}
