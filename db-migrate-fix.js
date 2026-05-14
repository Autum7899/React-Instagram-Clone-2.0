/**
 * Fix migration - runs remaining statements that failed
 */
require('dotenv').config()
const mysql = require('mysql2')

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'insta',
})

db.connect(err => {
  if (err) { console.error(err); process.exit(1) }
  console.log('Connected')

  const stmts = [
    "ALTER TABLE `posts` ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') COLLATE utf8mb4_bin NOT NULL DEFAULT 'approved' AFTER `post_time`",
    "ALTER TABLE `posts` ADD COLUMN `rejection_reason` VARCHAR(500) COLLATE utf8mb4_bin NOT NULL DEFAULT '' AFTER `status`",
    "UPDATE `posts` SET `status` = 'approved'",
    "ALTER TABLE `users` ADD COLUMN `role` ENUM('user', 'admin') COLLATE utf8mb4_bin NOT NULL DEFAULT 'user' AFTER `lastOnline`",
    "ALTER TABLE `notifications` MODIFY `type` ENUM('follow','tag','like','share','shared_your_post','comment','favourites','recommend','add_grp_member','invite','change_admin','new_con','mention_post','mention_comment','friend_request','friend_accept','post_approved','post_rejected') NOT NULL",
    "CREATE TABLE IF NOT EXISTS `friend_requests` (`request_id` int(11) NOT NULL AUTO_INCREMENT, `from_user` int(11) NOT NULL, `to_user` int(11) NOT NULL, `status` ENUM('pending','accepted','rejected') COLLATE utf8mb4_bin NOT NULL DEFAULT 'pending', `request_time` varchar(100) COLLATE utf8mb4_bin NOT NULL, `response_time` varchar(100) COLLATE utf8mb4_bin NOT NULL DEFAULT '', PRIMARY KEY (`request_id`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin",
  ]

  let i = 0
  function next() {
    if (i >= stmts.length) {
      console.log('\nAll done!')
      process.exit(0)
    }
    db.query(stmts[i], (e) => {
      if (e) {
        console.log('Skip:', e.code || e.message)
      } else {
        console.log('OK:', stmts[i].substring(0, 70) + '...')
      }
      i++
      next()
    })
  }
  next()
})
