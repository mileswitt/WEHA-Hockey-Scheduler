import mysql from 'mysql2/promise'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let pool = null

export function getDb() {
  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.MYSQL_HOST     || 'localhost',
      port:               Number(process.env.MYSQL_PORT) || 3306,
      user:               process.env.MYSQL_USER     || 'root',
      password:           process.env.MYSQL_PASSWORD || '',
      database:           process.env.MYSQL_DATABASE || 'weha',
      waitForConnections: true,
      connectionLimit:    10,
    })
  }
  return pool
}

// Run the schema on startup. Ignores "already exists" errors so it's safe to
// call repeatedly without wiping data.
export async function initSchema() {
  const schema     = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  const db         = getDb()
  const statements = schema.split(';').map(s => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    try {
      await db.query(stmt)
    } catch (e) {
      // 1050 = table already exists, 1061 = duplicate key name (index already exists)
      if (![1050, 1061].includes(e.errno)) throw e
    }
  }
}

// Wraps a callback in a MySQL transaction. The callback receives the connection
// and must use it for all queries within the transaction.
export async function withTransaction(fn) {
  const db   = getDb()
  const conn = await db.getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
