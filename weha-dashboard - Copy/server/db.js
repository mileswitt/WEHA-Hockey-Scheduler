import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH     = path.join(__dirname, 'data', 'weha.db')
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')

let _db = null

export function getDb() {
  if (_db) return _db

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  // Initialize schema if the DB is fresh
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  _db.exec(schema)

  return _db
}
