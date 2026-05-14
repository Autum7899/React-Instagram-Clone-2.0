require('dotenv').config()
const mysql = require('mysql2')

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'insta',
})

db.connect(err => {
  if (err) { console.error(err); process.exit(1) }
  console.log('Connected to database for schema fix...')

  const stmts = [
    "ALTER TABLE `users` ADD COLUMN `nickname` VARCHAR(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '' AFTER `surname`",
    "ALTER TABLE `users` ADD COLUMN `cover_image` VARCHAR(255) COLLATE utf8mb4_bin NOT NULL DEFAULT ''",
    "ALTER TABLE `users` ADD COLUMN `account_status` ENUM('active', 'suspended') NOT NULL DEFAULT 'active'",
  ]

  let i = 0
  function next() {
    if (i >= stmts.length) {
      console.log('User schema fixed!')
      process.exit(0)
    }
    db.query(stmts[i], (e) => {
      if (e) {
        console.log('Skip or Error:', e.code || e.message)
      } else {
        console.log('OK:', stmts[i].substring(0, 50) + '...')
      }
      i++
      next()
    })
  }
  next()
})
