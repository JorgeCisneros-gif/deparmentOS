// src/jobs/reports-processor.job.ts
//
// Procesa la cola de reportes asíncronos:
//   1. Llama al backend POST /reports/jobs/process-next cada 30 segundos
//   2. Si había job pending, lo procesa. Si no, no hace nada.
//   3. Periódicamente (1 vez/día) llama a /reports/jobs/cleanup para
//      borrar archivos y filas viejas.

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000  // 5 min por job

interface ProcessNextResponse {
  jobId:   string | null
  estado:  string
}

interface CleanupResponse {
  jobsDeleted: number
  filesDeleted: number
}

async function callBackend<T>(endpoint: string): Promise<T> {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://backend:3000'
  const token      = process.env.SCHEDULER_API_TOKEN  || ''

  if (!token) {
    throw new Error('SCHEDULER_API_TOKEN no configurado.')
  }

  const url = `${backendUrl}/api/v1/reports/${endpoint}`
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new Error(`Backend ${response.status}: ${body.slice(0, 200)}`)
    }
    return (await response.json()) as T
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Timeout llamando al backend')
    }
    throw err
  } finally {
    clearTimeout(timeoutHandle)
  }
}

/**
 * Procesa el siguiente job pending (si lo hay).
 */
export async function processNextReportJob(): Promise<ProcessNextResponse | null> {
  const started = Date.now()
  try {
    const result = await callBackend<ProcessNextResponse>('jobs/process-next')
    const elapsed = ((Date.now() - started) / 1000).toFixed(1)

    if (result.jobId) {
      console.log(`[ReportsProcessor] Job ${result.jobId} → ${result.estado} (${elapsed}s)`)
    }
    return result
  } catch (err: any) {
    console.error(`[ReportsProcessor] Error: ${err.message}`)
    return null
  }
}

/**
 * Limpia jobs antiguos. Llamar 1 vez al día.
 */
export async function cleanupReportJobs(): Promise<CleanupResponse | null> {
  try {
    const result = await callBackend<CleanupResponse>('jobs/cleanup')
    console.log(
      `[ReportsCleanup] ${result.jobsDeleted} jobs y ${result.filesDeleted} archivos borrados`,
    )
    return result
  } catch (err: any) {
    console.error(`[ReportsCleanup] Error: ${err.message}`)
    return null
  }
}
