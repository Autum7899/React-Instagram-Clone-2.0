-- ============================================================
-- Database Migration for React Instagram Clone 2.0
-- Run this AFTER the initial db.sql setup
-- ============================================================

-- --------------------------------------------------------
-- 1. Add new columns to `users` table
-- --------------------------------------------------------

ALTER TABLE `users` ADD COLUMN `role` ENUM('user', 'admin') COLLATE utf8mb4_bin NOT NULL DEFAULT 'user' AFTER `lastOnline`;
ALTER TABLE `users` ADD COLUMN `nickname` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL DEFAULT '' AFTER `surname`;
ALTER TABLE `users` ADD COLUMN `cover_image` VARCHAR(500) COLLATE utf8mb4_bin NOT NULL DEFAULT '' AFTER `lastOnline`;
ALTER TABLE `users` ADD COLUMN `account_status` ENUM('active', 'locked', 'deleted') COLLATE utf8mb4_bin NOT NULL DEFAULT 'active' AFTER `cover_image`;

-- --------------------------------------------------------
-- 2. Add new columns to `posts` table
-- --------------------------------------------------------

ALTER TABLE `posts` ADD COLUMN `status` ENUM('pending', 'approved', 'rejected') COLLATE utf8mb4_bin NOT NULL DEFAULT 'approved' AFTER `post_time`;
ALTER TABLE `posts` ADD COLUMN `rejection_reason` VARCHAR(500) COLLATE utf8mb4_bin NOT NULL DEFAULT '' AFTER `status`;

-- Set all existing posts to approved
UPDATE `posts` SET `status` = 'approved' WHERE `status` = 'approved';

-- --------------------------------------------------------
-- 3. Expand notification types
-- --------------------------------------------------------

ALTER TABLE `notifications` MODIFY `type` ENUM(
  'follow','tag','like','share','shared_your_post','comment',
  'favourites','recommend','add_grp_member','invite','change_admin',
  'new_con','mention_post','mention_comment',
  'friend_request','friend_accept','post_approved','post_rejected'
) NOT NULL;

-- --------------------------------------------------------
-- 4. Create friend_requests table
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `friend_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `from_user` int(11) NOT NULL,
  `to_user` int(11) NOT NULL,
  `status` ENUM('pending', 'accepted', 'rejected') COLLATE utf8mb4_bin NOT NULL DEFAULT 'pending',
  `request_time` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `response_time` varchar(100) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  PRIMARY KEY (`request_id`),
  KEY `idx_from_user` (`from_user`),
  KEY `idx_to_user` (`to_user`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- --------------------------------------------------------
-- 5. Add indexes for performance
-- --------------------------------------------------------

-- Index on posts.status for filtering
ALTER TABLE `posts` ADD KEY `idx_post_status` (`status`);

-- Index on users.account_status
ALTER TABLE `users` ADD KEY `idx_account_status` (`account_status`);

-- Index on users.role
ALTER TABLE `users` ADD KEY `idx_user_role` (`role`);
