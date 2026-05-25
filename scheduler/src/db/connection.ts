import { Pool, PoolClient } from 'pg'

// Pool de conexiones — reutiliza la misma BD que el backend NestJS
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'edify_core',
  user:     process.env.DB_USER     || 'edify_user',
  password: process.env.DB_PASS     || 'edify_pass_2024',
  max:      5,    // máximo 5 conexiones simultáneas
  idleTimeoutMillis: 30_000,
})

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err.message)
})

export async function query<T = any>(
  sql: string,
  params: any[] = [],
): Promise<T[]> {
  const client: PoolClient = await pool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

export async function testConnection(): Promise<void> {
  const rows = await query<{ now: string }>('SELECT NOW() as now')
  console.log(`[DB] Conexión OK — servidor: ${rows[0].now}`)
}

export default pool
