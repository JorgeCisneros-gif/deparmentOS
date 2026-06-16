// src/utils/template.ts
// Renderiza templates de notificación reemplazando variables {nombre}

export function renderTemplate(
  template: string | null | undefined,
  vars: Record<string, string | number>,
): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = vars[key]
    return val !== undefined ? String(val) : `{${key}}`
  })
}

// Formatea monto como "1,234.56"
export function fmtMonto(monto: number): string {
  return monto.toFixed(2)
}

// Nombres de meses
const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre']

export function fmtPeriodo(mes: number, anio: number): string {
  return `${MESES[mes] || mes} ${anio}`
}
