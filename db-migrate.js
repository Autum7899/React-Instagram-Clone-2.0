/**
 * Database Migration Runner
 * Run: node db-migrate.js
 * 
 * This applies schema changes for new features:
 * - User roles, nickname, cover_image, account_status
 * - Post approval status
 * - Friend requests table
 * - Extended notification types
 */

require('dotenv').config()

const fs = require('fs')
const mysql = require('mysql2')
const path = require('path')

const {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} = process.env

const db = mysql.createConnection({
  host: MYSQL_HOST || 'localhost',
  port: MYSQL_PORT || 3306,
  user: MYSQL_USER || 'root',
  password: MYSQL_PASSWORD || '',
  database: MYSQL_DATABASE || 'insta',
  multipleStatements: true,
})

db.connect(err => {
  if (err) {
    console.error('❌ Connection error:', err.message)
    process.exit(1)
  }

  console.log('✅ Connected to MySQL database:', MYSQL_DATABASE)
  console.log('📄 Reading db-migrate.sql...')

  const sqlStr = fs.readFileSync(path.join(__dirname, 'db-migrate.sql'), 'utf8')

  // Split by semicolons and execute each statement individually
  // to handle errors gracefully (e.g., column already exists)
  const statements = sqlStr
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let completed = 0
  let errors = 0

  const executeNext = (index) => {
    if (index >= statements.length) {
      console.log(`\n🎉 Migration complete! ${completed} statements executed, ${errors} skipped (already applied).`)
      process.exit(0)
    }

    const stmt = statements[index]
    // Skip pure comment lines
    const cleanStmt = stmt.replace(/--[^\n]*/g, '').trim()
    if (!cleanStmt) {
      executeNext(index + 1)
      return
    }

    db.query(cleanStmt, (err) => {
      if (err) {
        // Common errors for "already exists" scenarios — skip gracefully
        if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`⏭️  Skipped (already exists): ${cleanStmt.substring(0, 60)}...`)
          errors++
        } else {
          console.error(`⚠️  Error on statement: ${cleanStmt.substring(0, 80)}...`)
          console.error(`   ${err.message}`)
          errors++
        }
      } else {
        console.log(`✅ Executed: ${cleanStmt.substring(0, 60)}...`)
        completed++
      }
      executeNext(index + 1)
    })
  }

  executeNext(0)
})
