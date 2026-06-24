// src/jobs/meter-images-housekeeping.job.ts
//
// Job nocturno que dispara el housekeeping de meter_images en el backend.
//
// Estrategia: el scheduler NO ejecuta la lógica directamente. Hace una
// llamada HTTP autenticada al endpoint del backend que ya conoce toda la
// lógica: POST /api/v1/readings/housekeeping
//
// Razón: la lógica vive en un solo lugar (el backend). El scheduler queda
// "tonto" — solo cron + HTTP. Aprovechamos los servicios, transacciones y
// validaciones del backend.
//
// Frecuencia: configurable via env METER_IMAGES_HOUSEKEEPING_CRON.
// Default: '0 3 * * *' → 3 AM hora del servidor.

interface HousekeepingResponse {
  retried:        number
  retriedOk:      number
  purgedLocal:    number
  expiredDeleted: number
}

// Tiempo máximo total para el housekeeping (en algunos casos puede subir
// muchas fotos legacy y tomar varios minutos).
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000  // 10 minutos

export async function runMeterImagesHousekeeping(): Promise<HousekeepingResponse> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000'
  const token      = process.env.SCHEDULER_API_TOKEN  || ''

  if (!token) {
    throw new Error(
      'SCHEDULER_API_TOKEN no configurado. Necesario para autenticar con el backend.',
    )
  }

  const url = `${backendUrl}/api/v1/readings/housekeeping`
  const started = Date.now()

  console.log(`[MeterImagesHousekeeping] POST ${url}`)

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    })

    const elapsed = ((Date.now() - started) / 1000).toFixed(1)

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Backend respondió ${response.status} ${response.statusText} ` +
        `(${elapsed}s): ${body.slice(0, 300)}`,
      )
    }

    const result = (await response.json()) as HousekeepingResponse

    console.log(
      `[MeterImagesHousekeeping] ✓ OK en ${elapsed}s: ` +
      `${result.retried} reintentos (${result.retriedOk} exitosos), ` +
      `${result.purgedLocal} locales purgados, ` +
      `${result.expiredDeleted} expirados.`,
    )

    return result
  } catch (err: any) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1)
    if (err.name === 'AbortError') {
      throw new Error(`Timeout después de ${elapsed}s llamando al backend`)
    }
    throw new Error(`Falló housekeeping (${elapsed}s): ${err.message}`)
  } finally {
    clearTimeout(timeoutHandle)
  }
}
