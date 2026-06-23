import { Module, Global } from '@nestjs/common';
import { StorageGatewayService } from './storage-gateway.service';
import { StorageGatewayController } from './storage-gateway.controller';

/**
 * Módulo del cliente del Storage Gateway.
 *
 * @Global() para que el StorageGatewayService pueda inyectarse
 * en cualquier otro módulo (readings, payments, etc.) sin
 * tener que importar el módulo en cada uno.
 *
 * En la Entrega 3, ReadingsModule podrá usar este servicio para
 * subir las fotos confirmadas al gateway. No requerirá imports
 * adicionales gracias a @Global().
 */
@Global()
@Module({
  controllers: [StorageGatewayController],
  providers:   [StorageGatewayService],
  exports:     [StorageGatewayService],
})
export class StorageGatewayModule {}
