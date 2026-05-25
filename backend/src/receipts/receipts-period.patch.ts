// ============================================================
//  PATCH: Agregar a src/receipts/receipts.controller.ts
//  Nuevo endpoint: GET /receipts/period
//  Devuelve los 3 recibos del período agrupados por tipo
//  para mostrarlos en la pantalla de carga de recibos
// ============================================================

// Agregar este método en ReceiptsController:

/*
  @Get('period')
  @Roles(UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Recibos del período agrupados por tipo de servicio',
    description: 'Devuelve agua, luz e internet del mes/año para un edificio. Indica cuáles faltan cargar.',
  })
  @ApiQuery({ name: 'buildingId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  async getPeriodReceipts(
    @Query('buildingId') buildingId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    // Obtener servicios del edificio
    const services = await this.svc['serviceRepo'].find({
      where: { idEdificio: buildingId, activo: true },
    });

    // Obtener recibos del período
    const receipts = await this.svc.findAll(undefined, year, month);
    const receiptsOfBuilding = receipts.filter(r =>
      services.some(s => s.id === r.idServicio)
    );

    // Agrupar por tipo
    const byType: Record<string, any> = {};
    for (const r of receiptsOfBuilding) {
      if (r.servicio) byType[r.servicio.tipo] = r;
    }

    return {
      periodoMes: month,
      periodoAnio: year,
      agua:     byType['agua']     || null,
      luz:      byType['luz']      || null,
      internet: byType['internet'] || null,
      listo: ['agua', 'luz', 'internet'].every(t => !!byType[t]),
    };
  }
*/
