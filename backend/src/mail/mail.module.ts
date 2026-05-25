// src/mail/mail.module.ts
import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Global()   // disponible en todos los módulos sin importar explícitamente
@Module({
  providers:   [MailService],
  controllers: [MailController],
  exports:     [MailService],
})
export class MailModule {}
