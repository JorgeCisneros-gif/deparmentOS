"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const buildings_module_1 = require("./buildings/buildings.module");
const departments_module_1 = require("./departments/departments.module");
const readings_module_1 = require("./readings/readings.module");
const fees_module_1 = require("./fees/fees.module");
const services_module_1 = require("./services/services.module");
const receipts_module_1 = require("./receipts/receipts.module");
const payments_module_1 = require("./payments/payments.module");
const notifications_module_1 = require("./notifications/notifications.module");
const cleaning_module_1 = require("./cleaning/cleaning.module");
const template_module_1 = require("./templates/template.module");
const shared_module_1 = require("./shared/shared.module");
const propietarios_module_1 = require("./propietarios/propietarios.module");
const gastos_module_1 = require("./gastos/gastos.module");
const alicuotas_module_1 = require("./alicuotas/alicuotas.module");
const paises_module_1 = require("./paises/paises.module");
const mail_module_1 = require("./mail/mail.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'edify_core',
                username: process.env.DB_USER || 'edify_user',
                password: process.env.DB_PASS || 'edify_pass_2024',
                autoLoadEntities: true,
                synchronize: false,
                logging: process.env.NODE_ENV === 'development',
            }),
            propietarios_module_1.PropietariosModule,
            shared_module_1.SharedModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            buildings_module_1.BuildingsModule,
            departments_module_1.DepartmentsModule,
            services_module_1.ServicesModule,
            receipts_module_1.ReceiptsModule,
            readings_module_1.ReadingsModule,
            fees_module_1.FeesModule,
            payments_module_1.PaymentsModule,
            notifications_module_1.NotificationsModule,
            cleaning_module_1.CleaningModule,
            template_module_1.TemplatesModule,
            gastos_module_1.GastosModule,
            mail_module_1.MailModule,
            alicuotas_module_1.AlicuotasModule,
            paises_module_1.PaisesModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map