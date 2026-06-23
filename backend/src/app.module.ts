// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { GruposModule } from './grupos/grupos.module';
import { AppConfigModule } from './config/app-config.module';
import { BuildingsModule } from './buildings/buildings.module';
import { DepartmentsModule } from './departments/departments.module';
import { ReadingsModule } from './readings/readings.module';
import { FeesModule } from './fees/fees.module';
import { ServicesModule } from './services/services.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CleaningModule } from './cleaning/cleaning.module';
import { TemplatesModule } from './templates/template.module';
import { SharedModule } from './shared/shared.module';
import { PropietariosModule } from './propietarios/propietarios.module';
import { GastosModule } from './gastos/gastos.module';
import { AlicuotasModule } from './alicuotas/alicuotas.module';
import { PaisesModule } from './paises/paises.module';
import { MailModule } from './mail/mail.module';
import { NotificacionConfigModule } from './notificacion-config/notificacion-config.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { NotificacionTipoModule } from './notificacion-tipo/notificacion-tipo.module';
import { StorageGatewayModule } from './storage-gateway/storage-gateway.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type:             'postgres',
      host:             process.env.DB_HOST     || 'localhost',
      port:             parseInt(process.env.DB_PORT || '5432'),
      database:         process.env.DB_NAME     || 'edify_core',
      username:         process.env.DB_USER     || 'edify_user',
      password:         process.env.DB_PASS     || 'edify_pass_2024',
      autoLoadEntities: true,
      synchronize:      false,
      logging:          process.env.NODE_ENV === 'development',
    }),
    PropietariosModule,
    SharedModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    GruposModule,
    AppConfigModule,
    BuildingsModule,
    DepartmentsModule,
    ServicesModule,
    ReceiptsModule,
    ReadingsModule,
    FeesModule,
    PaymentsModule,
    NotificationsModule,
    CleaningModule,
    TemplatesModule,
    GastosModule,
    MailModule,
    AlicuotasModule,
    PaisesModule,
    NotificacionConfigModule,
    NotificacionTipoModule,
    SchedulerModule,
    StorageGatewayModule, // ← integración con suite-os-storage
  ],
})
export class AppModule {}
