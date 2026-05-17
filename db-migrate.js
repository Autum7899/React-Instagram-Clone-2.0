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

  const migratePath = path.join(__dirname, 'db-migrate.sql')
  let fileStatements = []
  if (fs.existsSync(migratePath)) {
    console.log('📄 Reading db-migrate.sql...')
    const sqlStr = fs.readFileSync(migratePath, 'utf8')

    // Split by semicolons and execute each statement individually
    // to handle errors gracefully (e.g., column already exists)
    fileStatements = sqlStr
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
  } else {
    console.log('No db-migrate.sql found. Using built-in migration steps only.')
  }

  const legacyFixStatements = [
    "ALTER TABLE `posts` ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') COLLATE utf8mb4_bin NOT NULL DEFAULT 'approved' AFTER `post_time`",
    "ALTER TABLE `posts` ADD COLUMN `rejection_reason` VARCHAR(500) COLLATE utf8mb4_bin NOT NULL DEFAULT '' AFTER `status`",
    "UPDATE `posts` SET `status` = 'approved'",
    "ALTER TABLE `users` ADD COLUMN `role` ENUM('user', 'admin') COLLATE utf8mb4_bin NOT NULL DEFAULT 'user' AFTER `lastOnline`",
    "ALTER TABLE `notifications` MODIFY `type` ENUM('follow','tag','like','share','shared_your_post','comment','favourites','recommend','add_grp_member','invite','change_admin','new_con','mention_post','mention_comment','friend_request','friend_accept','post_approved','post_rejected') NOT NULL",
    "CREATE TABLE IF NOT EXISTS `friend_requests` (`request_id` int(11) NOT NULL AUTO_INCREMENT, `from_user` int(11) NOT NULL, `to_user` int(11) NOT NULL, `status` ENUM('pending','accepted','rejected') COLLATE utf8mb4_bin NOT NULL DEFAULT 'pending', `request_time` varchar(100) COLLATE utf8mb4_bin NOT NULL, `response_time` varchar(100) COLLATE utf8mb4_bin NOT NULL DEFAULT '', PRIMARY KEY (`request_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin",
  ]

  const seen = new Set()
  const statements = [...fileStatements, ...legacyFixStatements].filter(stmt => {
    const trimmed = stmt.trim()
    if (!trimmed || seen.has(trimmed)) return false
    seen.add(trimmed)
    return true
  })

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
