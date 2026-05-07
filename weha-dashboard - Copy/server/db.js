import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ssl = process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined

const pool = mysql.createPool({
  host:               process.env.MYSQL_HOST     || 'localhost',
  port:               Number(process.env.MYSQL_PORT) || 3306,
  user:               process.env.MYSQL_USER     || 'root',
  password:           process.env.MYSQL_PASSWORD || '',
  database:           process.env.MYSQL_DATABASE || 'weha',
  waitForConnections: true,
  connectionLimit:    10,
  ssl,
  multipleStatements: false,
})

export function getDb() {
  return pool
}

export async function withTransaction(fn) {
  const conn = await pool.getConnection()
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

// Called at server startup — creates all tables from schema.sql if they don't exist,
// then verifies the connection is healthy before accepting traffic.
export async function initSchema() {
  let conn
  try {
    conn = await pool.getConnection()

    // Read schema.sql and execute each statement individually.
    // CREATE TABLE IF NOT EXISTS is idempotent.
    // CREATE INDEX will fail with errno 1061 if the index already exists — that is safe to ignore.
    const schemaPath = path.join(__dirname, 'schema.sql')
    const sql = fs.readFileSync(schemaPath, 'utf8')

    const stmts = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const stmt of stmts) {
      try {
        await conn.query(stmt)
      } catch (e) {
        // 1061 = Duplicate key name (index already exists — safe to skip)
        if (e.errno === 1061) continue
        throw e
      }
    }

    console.log(`MySQL connected: ${process.env.MYSQL_DATABASE || 'weha'} @ ${process.env.MYSQL_HOST || 'localhost'}:${process.env.MYSQL_PORT || 3306}`)
    console.log('Schema ready.')
  } catch (e) {
    console.error(`MySQL init failed: ${e.message}`)
    console.error('Check MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE in .env')
    throw e
  } finally {
    conn?.release()
  }
}
