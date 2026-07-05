// src/jobs/vouchers-housekeeping.job.ts
//
// Job de housekeeping de comprobantes de pago.
//
// Llama al backend POST /payments/housekeeping que ejecuta:
//   - retryPendingUploads: sube al Drive los vouchers en 'local'
//   - purgeLocalFiles: borra archivos locales ya subidos cuya retención expiró
//
// El scheduler solo dispara, la lógica vive en el backend (reutiliza
// StorageGatewayService, TypeORM, MAX_ATTEMPTS, etc.). Mismo patrón
// que meter-images-housekeeping.

const HOUSEKEEPING_TIMEOUT_MS = 10 * 60 * 1000  // 10 min

interface HousekeepingResponse {
  retried:        number
  retriedOk:      number
  purgedLocal:    number
  timestamp?:     string
  ok?:            boolean
}

export async function runVouchersHousekeeping(): Promise<HousekeepingResponse | null> {
  const started = Date.now()
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000'
  const token      = process.env.SCHEDULER_API_TOKEN  || ''

  if (!token) {
    console.error('[VouchersHousekeeping] SCHEDULER_API_TOKEN no configurado, abortando')
    return null
  }

  const url = `${backendUrl}/api/v1/payments/housekeeping`
  console.log(`[VouchersHousekeeping] → POST ${url}`)

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), HOUSEKEEPING_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    })

    const elapsed = ((Date.now() - started) / 1000).toFixed(1)

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(
        `Backend respondió ${response.status} ${response.statusText} (${elapsed}s): ${body.slice(0, 300)}`,
      )
    }

    const result = (await response.json()) as HousekeepingResponse
    console.log(
      `[VouchersHousekeeping] ✓ retried=${result.retried} ok=${result.retriedOk} ` +
      `purged=${result.purgedLocal} (${elapsed}s)`,
    )
    return result

  } catch (err: any) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1)
    if (err.name === 'AbortError') {
      console.error(`[VouchersHousekeeping] ✗ Timeout (${elapsed}s)`)
    } else {
      console.error(`[VouchersHousekeeping] ✗ Error (${elapsed}s):`, err.message)
    }
    return null

  } finally {
    clearTimeout(timeoutHandle)
  }
}
