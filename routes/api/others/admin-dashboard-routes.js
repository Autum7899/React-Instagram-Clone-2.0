// ADMIN DASHBOARD ROUTES - User management, post management, statistics

const app = require('express').Router(),
  db = require('../../../config/db'),
  User = require('../../../config/User'),
  Post = require('../../../config/Post'),
  mw = require('../../../config/Middlewares')

// ============================================================
// STATISTICS
// ============================================================

// GET SYSTEM STATISTICS
app.post('/admin/get-stats', mw.AdminOnly, async (req, res) => {
  try {
    // User stats
    let [{ total_users }] = await db.query('SELECT COUNT(id) AS total_users FROM users')
    let [{ active_users }] = await db.query("SELECT COUNT(id) AS active_users FROM users WHERE account_status='active'")
    let [{ locked_users }] = await db.query("SELECT COUNT(id) AS locked_users FROM users WHERE account_status='locked'")
    let [{ deleted_users }] = await db.query("SELECT COUNT(id) AS deleted_users FROM users WHERE account_status='deleted'")
    let [{ admin_users }] = await db.query("SELECT COUNT(id) AS admin_users FROM users WHERE role='admin'")

    // Post stats
    let [{ total_posts }] = await db.query('SELECT COUNT(post_id) AS total_posts FROM posts')
    let [{ approved_posts }] = await db.query("SELECT COUNT(post_id) AS approved_posts FROM posts WHERE status='approved'")
    let [{ pending_posts }] = await db.query("SELECT COUNT(post_id) AS pending_posts FROM posts WHERE status='pending'")
    let [{ rejected_posts }] = await db.query("SELECT COUNT(post_id) AS rejected_posts FROM posts WHERE status='rejected'")

    // Interaction stats
    let [{ total_comments }] = await db.query('SELECT COUNT(comment_id) AS total_comments FROM comments')
    let [{ total_likes }] = await db.query('SELECT COUNT(like_id) AS total_likes FROM likes')
    let [{ total_follows }] = await db.query('SELECT COUNT(follow_id) AS total_follows FROM follow_system')
    let [{ total_shares }] = await db.query('SELECT COUNT(share_id) AS total_shares FROM shares')
    let [{ total_conversations }] = await db.query('SELECT COUNT(con_id) AS total_conversations FROM conversations')
    let [{ total_groups }] = await db.query('SELECT COUNT(group_id) AS total_groups FROM groups')
    let [{ total_notifications }] = await db.query('SELECT COUNT(notify_id) AS total_notifications FROM notifications')

    // Friend request stats
    let friendRequestStats = { total: 0, pending: 0, accepted: 0, rejected: 0 }
    try {
      let [{ total_fr }] = await db.query('SELECT COUNT(request_id) AS total_fr FROM friend_requests')
      let [{ pending_fr }] = await db.query("SELECT COUNT(request_id) AS pending_fr FROM friend_requests WHERE status='pending'")
      let [{ accepted_fr }] = await db.query("SELECT COUNT(request_id) AS accepted_fr FROM friend_requests WHERE status='accepted'")
      let [{ rejected_fr }] = await db.query("SELECT COUNT(request_id) AS rejected_fr FROM friend_requests WHERE status='rejected'")
      friendRequestStats = { total: total_fr, pending: pending_fr, accepted: accepted_fr, rejected: rejected_fr }
    } catch (e) {
      // friend_requests table may not exist yet
    }

    // Recent activity (last 7 days)
    let sevenDaysAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000)
    let [{ new_users_7d }] = await db.query('SELECT COUNT(id) AS new_users_7d FROM users WHERE joined > ?', [sevenDaysAgo.toString()])
    let [{ new_posts_7d }] = await db.query('SELECT COUNT(post_id) AS new_posts_7d FROM posts WHERE post_time > ?', [sevenDaysAgo.toString()])

    res.json({
      users: {
        total: total_users,
        active: active_users,
        locked: locked_users,
        deleted: deleted_users,
        admins: admin_users,
        new_7d: new_users_7d,
      },
      posts: {
        total: total_posts,
        approved: approved_posts,
        pending: pending_posts,
        rejected: rejected_posts,
        new_7d: new_posts_7d,
      },
      interactions: {
        comments: total_comments,
        likes: total_likes,
        follows: total_follows,
        shares: total_shares,
        conversations: total_conversations,
        groups: total_groups,
        notifications: total_notifications,
      },
      friend_requests: friendRequestStats,
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// ============================================================
// USER MANAGEMENT
// ============================================================

// GET ALL USERS (Admin) [REQ = PAGE, SEARCH, STATUS]
app.post('/admin/get-users', mw.AdminOnly, async (req, res) => {
  try {
    let { page, search, status } = req.body
    let limit = 20
    let offset = ((page || 1) - 1) * limit

    let whereClause = "WHERE 1=1"
    let params = []

    if (search) {
      whereClause += ` AND (username LIKE "%${search}%" OR firstname LIKE "%${search}%" OR surname LIKE "%${search}%" OR email LIKE "%${search}%")`
    }
    if (status) {
      whereClause += ' AND account_status=?'
      params.push(status)
    }

    let users = await db.query(
      `SELECT id, username, firstname, surname, nickname, email, bio, joined, email_verified, account_type, role, account_status, isOnline, lastOnline FROM users ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    let [{ total }] = await db.query(
      `SELECT COUNT(id) AS total FROM users ${whereClause}`,
      params
    )

    let result = []
    for (let u of users) {
      let [{ post_count }] = await db.query('SELECT COUNT(post_id) AS post_count FROM posts WHERE user=?', [u.id])
      let [{ followers_count }] = await db.query('SELECT COUNT(follow_id) AS followers_count FROM follow_system WHERE follow_to=?', [u.id])
      let [{ following_count }] = await db.query('SELECT COUNT(follow_id) AS following_count FROM follow_system WHERE follow_by=?', [u.id])

      result.push({
        ...u,
        post_count,
        followers_count,
        following_count,
      })
    }

    res.json({
      users: result,
      total,
      page: page || 1,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// LOCK USER ACCOUNT [REQ = USER_ID]
app.post('/admin/lock-user', mw.AdminOnly, async (req, res) => {
  try {
    let { user_id } = req.body
    let { id: adminId } = req.session

    // Can't lock yourself
    if (user_id == adminId) {
      return res.json({ mssg: 'Cannot lock your own account!' })
    }

    // Can't lock other admins
    let targetRole = await User.getRole(user_id)
    if (targetRole === 'admin') {
      return res.json({ mssg: 'Cannot lock another admin account!' })
    }

    await User.updateAccountStatus(user_id, 'locked')
    let username = await User.getWhat('username', user_id)

    res.json({
      success: true,
      mssg: `Account ${username} has been locked!`,
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// UNLOCK USER ACCOUNT [REQ = USER_ID]
app.post('/admin/unlock-user', mw.AdminOnly, async (req, res) => {
  try {
    let { user_id } = req.body

    await User.updateAccountStatus(user_id, 'active')
    let username = await User.getWhat('username', user_id)

    res.json({
      success: true,
      mssg: `Account ${username} has been unlocked!`,
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// DELETE USER ACCOUNT (soft delete) [REQ = USER_ID]
app.post('/admin/delete-user', mw.AdminOnly, async (req, res) => {
  try {
    let { user_id } = req.body
    let { id: adminId } = req.session

    // Can't delete yourself
    if (user_id == adminId) {
      return res.json({ mssg: 'Cannot delete your own account!' })
    }

    // Can't delete other admins
    let targetRole = await User.getRole(user_id)
    if (targetRole === 'admin') {
      return res.json({ mssg: 'Cannot delete another admin account!' })
    }

    await User.updateAccountStatus(user_id, 'deleted')
    let username = await User.getWhat('username', user_id)

    res.json({
      success: true,
      mssg: `Account ${username} has been deleted!`,
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// CHANGE USER ROLE [REQ = USER_ID, ROLE]
app.post('/admin/change-user-role', mw.AdminOnly, async (req, res) => {
  try {
    let { user_id, role } = req.body

    if (!['user', 'admin'].includes(role)) {
      return res.json({ mssg: 'Invalid role!' })
    }

    await db.query('UPDATE users SET role=? WHERE id=?', [role, user_id])
    let username = await User.getWhat('username', user_id)

    res.json({
      success: true,
      mssg: `${username} role changed to ${role}!`,
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// ============================================================
// POST MANAGEMENT
// ============================================================

// ADMIN DELETE POST [REQ = POST_ID]
app.post('/admin/delete-post', mw.AdminOnly, async (req, res) => {
  try {
    let { post_id } = req.body

    await Post.deletePost({
      post: post_id,
      when: 'user',
    })

    res.json({
      success: true,
      mssg: 'Post deleted by admin!',
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// ============================================================
// COMMENT MANAGEMENT
// ============================================================

// GET ALL COMMENTS (Admin) [REQ = PAGE, POST_ID]
app.post('/admin/get-comments', mw.AdminOnly, async (req, res) => {
  try {
    let { page, post_id } = req.body
    let limit = 20
    let offset = ((page || 1) - 1) * limit

    let whereClause = post_id ? 'WHERE comments.post_id=?' : ''
    let params = post_id ? [post_id, limit, offset] : [limit, offset]

    let comments = await db.query(
      `SELECT comments.comment_id, comments.type, comments.text, comments.commentSrc, comments.comment_by, users.username AS comment_by_username, comments.post_id, comments.comment_time FROM comments, users WHERE comments.comment_by = users.id ${post_id ? 'AND comments.post_id=?' : ''} ORDER BY comments.comment_time DESC LIMIT ? OFFSET ?`,
      params
    )

    let [{ total }] = post_id
      ? await db.query('SELECT COUNT(comment_id) AS total FROM comments WHERE post_id=?', [post_id])
      : await db.query('SELECT COUNT(comment_id) AS total FROM comments')

    res.json({
      comments,
      total,
      page: page || 1,
      pages: Math.ceil(total / limit),
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

// ADMIN DELETE COMMENT [REQ = COMMENT_ID]
app.post('/admin/delete-comment', mw.AdminOnly, async (req, res) => {
  try {
    let { comment_id } = req.body

    await db.query('DELETE FROM comments WHERE comment_id=?', [comment_id])

    res.json({
      success: true,
      mssg: 'Comment deleted by admin!',
    })
  } catch (error) {
    db.catchError(error, res)
  }
})

module.exports = app
