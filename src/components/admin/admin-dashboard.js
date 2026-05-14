import React, { Component } from 'react'
import { FadeIn } from 'animate-components'
import Title from '../others/title'
import { Redirect } from 'react-router-dom'
import { isAdmin } from '../../utils/admin-utils'
import axios from 'axios'

export default class AdminDashboard extends Component {
  state = {
    stats: null,
    loading: true,
    activeTab: 'overview',
    pendingPosts: [],
    users: [],
    comments: [],
    usersPage: 1,
    userSearch: '',
    userStatusFilter: '',
  }

  componentDidMount() {
    this.fetchStats()
    this.fetchPendingPosts()
    this.fetchUsers()
    this.fetchComments()
  }

  fetchStats = async () => {
    try {
      let { data } = await axios.post('/api/admin/get-stats')
      this.setState({ stats: data, loading: false })
    } catch (err) {
      this.setState({ loading: false })
    }
  }

  fetchPendingPosts = async () => {
    try {
      let { data } = await axios.post('/api/get-pending-posts')
      this.setState({ pendingPosts: data })
    } catch (err) { /* ignore */ }
  }

  fetchUsers = async (page = 1) => {
    try {
      let { data } = await axios.post('/api/admin/get-users', {
        page,
        search: this.state.userSearch,
        status: this.state.userStatusFilter,
      })
      this.setState({ users: data.users || [], usersPage: data.page })
    } catch (err) { /* ignore */ }
  }

  fetchComments = async () => {
    try {
      let { data } = await axios.post('/api/admin/get-comments', { page: 1 })
      this.setState({ comments: data.comments || [] })
    } catch (err) { /* ignore */ }
  }

  approvePost = async (post_id) => {
    await axios.post('/api/approve-post', { post_id })
    this.fetchPendingPosts()
    this.fetchStats()
  }

  rejectPost = async (post_id) => {
    let reason = prompt('Enter rejection reason:')
    if (reason) {
      await axios.post('/api/reject-post', { post_id, reason })
      this.fetchPendingPosts()
      this.fetchStats()
    }
  }

  lockUser = async (user_id) => {
    if (window.confirm('Are you sure you want to lock this account?')) {
      await axios.post('/api/admin/lock-user', { user_id })
      this.fetchUsers(this.state.usersPage)
      this.fetchStats()
    }
  }

  unlockUser = async (user_id) => {
    await axios.post('/api/admin/unlock-user', { user_id })
    this.fetchUsers(this.state.usersPage)
    this.fetchStats()
  }

  deleteUser = async (user_id) => {
    if (window.confirm('Are you sure you want to delete this account? This is a soft delete.')) {
      await axios.post('/api/admin/delete-user', { user_id })
      this.fetchUsers(this.state.usersPage)
      this.fetchStats()
    }
  }

  deleteComment = async (comment_id) => {
    if (window.confirm('Delete this comment?')) {
      await axios.post('/api/admin/delete-comment', { comment_id })
      this.fetchComments()
      this.fetchStats()
    }
  }

  deletePost = async (post_id) => {
    if (window.confirm('Permanently delete this post?')) {
      await axios.post('/api/admin/delete-post', { post_id })
      this.fetchPendingPosts()
      this.fetchStats()
    }
  }

  render() {
    let { stats, loading, activeTab, pendingPosts, users, comments } = this.state

    return (
      <div>
        {!isAdmin() && <Redirect to="/admin-login" />}

        <Title
          value="Admin Dashboard"
          desc="Manage users, posts, comments, and view system statistics"
        />

        <FadeIn duration="300ms">
          <div className="admin-dashboard" style={styles.container}>
            <h2 style={styles.heading}>📊 Admin Dashboard</h2>

            {/* Tab Navigation */}
            <div style={styles.tabs}>
              {['overview', 'users', 'posts', 'comments'].map(tab => (
                <button
                  key={tab}
                  style={{
                    ...styles.tab,
                    ...(activeTab === tab ? styles.activeTab : {}),
                  }}
                  onClick={() => this.setState({ activeTab: tab })}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {loading && <div style={styles.loading}>Loading statistics...</div>}

            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div style={styles.statsGrid}>
                <div style={{ ...styles.statCard, background: '#e3f2fd' }}>
                  <h3>👥 Users</h3>
                  <p style={styles.statNumber}>{stats.users.total}</p>
                  <small>Active: {stats.users.active} | Locked: {stats.users.locked} | Deleted: {stats.users.deleted}</small>
                  <br/><small>New (7d): {stats.users.new_7d} | Admins: {stats.users.admins}</small>
                </div>
                <div style={{ ...styles.statCard, background: '#e8f5e9' }}>
                  <h3>📝 Posts</h3>
                  <p style={styles.statNumber}>{stats.posts.total}</p>
                  <small>Approved: {stats.posts.approved} | Pending: {stats.posts.pending} | Rejected: {stats.posts.rejected}</small>
                  <br/><small>New (7d): {stats.posts.new_7d}</small>
                </div>
                <div style={{ ...styles.statCard, background: '#fff3e0' }}>
                  <h3>💬 Interactions</h3>
                  <p style={styles.statNumber}>{stats.interactions.comments + stats.interactions.likes}</p>
                  <small>Comments: {stats.interactions.comments} | Likes: {stats.interactions.likes}</small>
                  <br/><small>Shares: {stats.interactions.shares} | Follows: {stats.interactions.follows}</small>
                </div>
                <div style={{ ...styles.statCard, background: '#f3e5f5' }}>
                  <h3>🤝 Social</h3>
                  <p style={styles.statNumber}>{stats.interactions.groups}</p>
                  <small>Groups | Conversations: {stats.interactions.conversations}</small>
                  <br/><small>Notifications: {stats.interactions.notifications}</small>
                </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div>
                <div style={styles.filterBar}>
                  <input
                    type="text"
                    placeholder="Search users..."
                    style={styles.searchInput}
                    value={this.state.userSearch}
                    onChange={e => this.setState({ userSearch: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && this.fetchUsers(1)}
                  />
                  <select
                    style={styles.select}
                    value={this.state.userStatusFilter}
                    onChange={e => {
                      this.setState({ userStatusFilter: e.target.value }, () => this.fetchUsers(1))
                    }}
                  >
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="locked">Locked</option>
                    <option value="deleted">Deleted</option>
                  </select>
                </div>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Username</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Posts</th>
                      <th style={styles.th}>Followers</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={styles.tr}>
                        <td style={styles.td}>{u.id}</td>
                        <td style={styles.td}>{u.username}</td>
                        <td style={styles.td}>{u.firstname} {u.surname}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: u.role === 'admin' ? '#e91e63' : '#2196f3'
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            background: u.account_status === 'active' ? '#4caf50' :
                              u.account_status === 'locked' ? '#ff9800' : '#f44336'
                          }}>
                            {u.account_status}
                          </span>
                        </td>
                        <td style={styles.td}>{u.post_count}</td>
                        <td style={styles.td}>{u.followers_count}</td>
                        <td style={styles.td}>
                          {u.account_status === 'active' && (
                            <button style={styles.btnWarning} onClick={() => this.lockUser(u.id)}>Lock</button>
                          )}
                          {u.account_status === 'locked' && (
                            <button style={styles.btnSuccess} onClick={() => this.unlockUser(u.id)}>Unlock</button>
                          )}
                          {u.account_status !== 'deleted' && (
                            <button style={styles.btnDanger} onClick={() => this.deleteUser(u.id)}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Posts Tab (Pending) */}
            {activeTab === 'posts' && (
              <div>
                <h3 style={styles.subHeading}>⏳ Pending Posts ({pendingPosts.length})</h3>
                {pendingPosts.length === 0 && <p style={styles.emptyText}>No pending posts</p>}
                {pendingPosts.map(p => (
                  <div key={p.post_id} style={styles.postCard}>
                    <div style={styles.postHeader}>
                      <strong>@{p.username}</strong>
                      <span style={styles.postTime}>
                        {new Date(parseInt(p.post_time)).toLocaleString()}
                      </span>
                    </div>
                    {p.imgSrc && (
                      <img
                        src={`/posts/${p.imgSrc}`}
                        alt="Post"
                        style={styles.postImage}
                      />
                    )}
                    <p style={styles.postDesc}>{p.description}</p>
                    {p.nsfw_flagged && (
                      <div style={styles.nsfwWarning}>
                        ⚠️ NSFW flagged: {p.nsfw_words.join(', ')}
                      </div>
                    )}
                    <div style={styles.postActions}>
                      <button style={styles.btnSuccess} onClick={() => this.approvePost(p.post_id)}>
                        ✅ Approve
                      </button>
                      <button style={styles.btnWarning} onClick={() => this.rejectPost(p.post_id)}>
                        ❌ Reject
                      </button>
                      <button style={styles.btnDanger} onClick={() => this.deletePost(p.post_id)}>
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div>
                <h3 style={styles.subHeading}>💬 Recent Comments</h3>
                {comments.length === 0 && <p style={styles.emptyText}>No comments found</p>}
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Post</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Content</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comments.map(c => (
                      <tr key={c.comment_id} style={styles.tr}>
                        <td style={styles.td}>{c.comment_id}</td>
                        <td style={styles.td}>@{c.comment_by_username}</td>
                        <td style={styles.td}>#{c.post_id}</td>
                        <td style={styles.td}>{c.type}</td>
                        <td style={styles.td}>{c.text ? c.text.substring(0, 50) : c.commentSrc}</td>
                        <td style={styles.td}>{new Date(parseInt(c.comment_time)).toLocaleString()}</td>
                        <td style={styles.td}>
                          <button style={styles.btnDanger} onClick={() => this.deleteComment(c.comment_id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeIn>
      </div>
    )
  }
}

const styles = {
  container: { maxWidth: '1200px', margin: '20px auto', padding: '20px' },
  heading: { fontSize: '24px', marginBottom: '20px', color: '#333' },
  subHeading: { fontSize: '18px', marginBottom: '15px', color: '#555' },
  tabs: { display: 'flex', marginBottom: '20px', borderBottom: '2px solid #eee' },
  tab: {
    padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: '14px', fontWeight: '600', color: '#666', borderBottom: '2px solid transparent',
    marginBottom: '-2px', transition: 'all 0.3s',
  },
  activeTab: { color: '#1b9be9', borderBottom: '2px solid #1b9be9' },
  loading: { textAlign: 'center', padding: '40px', color: '#999' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
  statCard: {
    padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statNumber: { fontSize: '36px', fontWeight: 'bold', margin: '10px 0', color: '#333' },
  filterBar: { display: 'flex', gap: '10px', marginBottom: '15px' },
  searchInput: {
    padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', flex: 1,
    fontSize: '14px',
  },
  select: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '10px', background: '#f5f5f5', borderBottom: '2px solid #ddd', fontWeight: '600' },
  td: { padding: '10px', borderBottom: '1px solid #eee' },
  tr: { transition: 'background 0.2s' },
  badge: { padding: '2px 8px', borderRadius: '12px', color: '#fff', fontSize: '11px', fontWeight: '600' },
  btnSuccess: {
    padding: '5px 10px', background: '#4caf50', color: '#fff', border: 'none',
    borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontSize: '12px',
  },
  btnWarning: {
    padding: '5px 10px', background: '#ff9800', color: '#fff', border: 'none',
    borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontSize: '12px',
  },
  btnDanger: {
    padding: '5px 10px', background: '#f44336', color: '#fff', border: 'none',
    borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontSize: '12px',
  },
  postCard: {
    border: '1px solid #eee', borderRadius: '8px', padding: '15px', marginBottom: '15px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  postHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
  postTime: { color: '#999', fontSize: '12px' },
  postImage: { maxWidth: '300px', maxHeight: '200px', borderRadius: '4px', marginBottom: '10px' },
  postDesc: { color: '#333', marginBottom: '10px' },
  postActions: { display: 'flex', gap: '8px' },
  nsfwWarning: {
    background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: '4px',
    marginBottom: '10px', fontSize: '13px',
  },
  emptyText: { textAlign: 'center', color: '#999', padding: '30px' },
}
