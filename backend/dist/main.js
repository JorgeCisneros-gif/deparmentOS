"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter({ logger: false }));
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
    app.useGlobalFilters(new http_exception_filter_1.AllExceptionsFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.enableCors({ origin: '*' });
    app.setGlobalPrefix('api/v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Edify API')
        .setDescription('API para gestión de edificios multifamiliares — cuotas de agua, luz, internet y limpieza.\n\n' +
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
        '8. `POST /payments` — registrar pagos')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Edify API corriendo en: http://localhost:${port}/api/v1`);
    logger.log(`📖 Swagger docs:           http://localhost:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map