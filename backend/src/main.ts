import 'dotenv/config'; // ← DEBE ser la primera línea — carga el .env antes de todo
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import * as path from 'path';
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // Registrar multipart para subida de imágenes de medidores
  // Usando el adaptador nativo de Fastify en NestJS para evitar
  // conflictos de versiones entre @fastify/multipart y platform-fastify
  const fastifyInstance = app.getHttpAdapter().getInstance();
  await fastifyInstance.register(require('@fastify/multipart'), {
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024,
      files: 2,
    },
  });
  await fastifyInstance.register(require('@fastify/static'), {
  root: require('path').join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
  decorateReply: false,
});

  // Filtro global de excepciones
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({ origin: '*' });
  app.setGlobalPrefix('api/v1');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Edify API')
    .setDescription(
      'API para gestión de edificios multifamiliares — cuotas de agua, luz, internet y limpieza.\n\n' +
      '**Roles:**\n' +
      '- `supervisor`: acceso total\n' +
      '- `propietario`: solo lectura de sus propias cuotas e historial\n\n' +
      '**Flujo mensual:**\n' +
      '1. `POST /receipts` — registrar facturas del período\n' +
      '2. `GET /receipts/validate-period` — verificar que están todos los recibos\n' +
      '3. `POST /readings/ocr` — fotografiar medidores\n' +
      '4. `POST /readings/confirm-ocr` — confirmar lecturas\n' +
      '5. `POST /fees/calculate` — calcular cuotas\n' +
      '6. `POST /templates/render/all` — generar mensajes\n' +
      '7. `POST /notifications/confirm-all` — confirmar envíos\n' +
      '8. `POST /payments` — registrar pagos',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('Auth', 'Login y manejo de tokens')
    .addTag('Users', 'CRUD de usuarios supervisores y propietarios')
    .addTag('Buildings', 'CRUD de edificios')
    .addTag('Departments', 'CRUD de departamentos')
    .addTag('Services', 'Configuración de servicios')
    .addTag('Receipts', 'Facturas del proveedor')
    .addTag('Readings', 'Mediciones + OCR de imágenes')
    .addTag('Fees', 'Cálculo y consulta de cuotas mensuales')
    .addTag('Payments', 'Registro de pagos')
    .addTag('Notifications', 'Envío y confirmación de mensajes')
    .addTag('Cleaning', 'Gestión de limpieza del edificio')
    .addTag('Templates', 'Plantillas de mensajes personalizables')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Edify API corriendo en: http://localhost:${port}/api/v1`);
  logger.log(`📖 Swagger docs:           http://localhost:${port}/docs`);
}
bootstrap();
