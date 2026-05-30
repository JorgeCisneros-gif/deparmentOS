// src/constants/index.ts
// Constantes compartidas en todo el frontend
// Importar desde aquí en vez de definir en cada página

// ── Meses ────────────────────────────────────────────────────
// Índice 0 = vacío para que periodoMes=1 → MESES[1] = 'Enero'
export const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const MESES_CORTO = [
  '', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic',
]

// ── Servicios — config visual ────────────────────────────────
export const TIPO_SERVICIO_CFG: Record<string, {
  label: string; emoji: string; color: string; unidadDefault: string
}> = {
  agua:          { label: 'Agua',          emoji: '💧', color: '#4a9eff', unidadDefault: 'm3'  },
  luz:           { label: 'Luz',           emoji: '⚡', color: '#f59e0b', unidadDefault: 'kwh' },
  internet:      { label: 'Internet',      emoji: '📡', color: '#4caf82', unidadDefault: 'unidad' },
  limpieza:      { label: 'Limpieza',      emoji: '🧹', color: '#a78bfa', unidadDefault: 'unidad' },
  mantenimiento: { label: 'Mantenimiento', emoji: '🔧', color: '#fb923c', unidadDefault: 'unidad' },
  otro:          { label: 'Otro',          emoji: '📋', color: '#94a3b8', unidadDefault: 'unidad' },
}

// ── Unidades de medida ────────────────────────────────────────
export const UNIDAD_LABEL: Record<string, string> = {
  m3:     'm³',
  kwh:    'kWh',
  unidad: 'unid.',
}

// Devuelve el label de la unidad del servicio
export function getUnidadLabel(unidadMedida?: string | null): string {
  return UNIDAD_LABEL[unidadMedida || 'm3'] || 'm³'
}

// Devuelve el label del recibo según el tipo de servicio
export function getReciboLabel(tipo?: string): string {
  const cfg = TIPO_SERVICIO_CFG[tipo || 'agua']
  return cfg ? `Recibo de ${cfg.label.toLowerCase()}` : 'Recibo'
}

// ── Modos de cálculo ─────────────────────────────────────────
export const MODO_CALCULO_LABEL: Record<string, string> = {
  por_consumo_m3:       'Por consumo individual',
  por_consumo_ajustado: 'Por consumo ajustado',
  division_igualitaria: 'División igualitaria',
  porcentaje_alicuota:  'Por alícuota',
  fijo:                 'Monto fijo',
}

// Modos que requieren medición individual (lectura de medidor)
export const MODOS_CON_MEDICION = ['por_consumo_m3', 'por_consumo_ajustado']
