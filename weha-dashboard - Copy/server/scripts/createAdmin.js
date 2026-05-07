/**
 * createAdmin.js — create or update an admin user in the database.
 *
 * Usage:
 *   node server/scripts/createAdmin.js <email> <password>
 *
 * Example:
 *   node server/scripts/createAdmin.js admin@weha.com MySecurePassword123!
 */

import bcrypt from 'bcryptjs'
import { getDb } from '../db.js'

const [,, email, password] = process.argv

if (!email || !password) {
  console.error('Usage: node server/scripts/createAdmin.js <email> <password>')
  process.exit(1)
}

const hash     = await bcrypt.hash(password, 10)
const db       = getDb()
const [rows]   = await db.query('SELECT AdminID FROM Admin WHERE Email = ?', [email])
const existing = rows[0]

if (existing) {
  await db.query('UPDATE Admin SET PasswordHash = ? WHERE Email = ?', [hash, email])
  console.log(`Admin password updated for: ${email}`)
} else {
  await db.query('INSERT INTO Admin (Email, PasswordHash) VALUES (?, ?)', [email, hash])
  console.log(`Admin created: ${email}`)
}
process.exit(0)
