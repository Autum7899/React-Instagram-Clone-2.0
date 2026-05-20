import React, { Component } from 'react'
import { FadeIn } from 'animate-components'
import Title from '../others/title'
import { Redirect } from 'react-router-dom'
import { isAdmin } from '../../utils/admin-utils'
import axios from 'axios'
import Notify from 'handy-notification'

const emptyNewUser = {
  username: '',
  firstname: '',
  surname: '',
  email: '',
  password: '',
  role: 'user',
  account_status: 'active',
  account_type: 'public',
}

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
    newUser: { ...emptyNewUser },
    editUser: null,
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

  updateNewUser = (field, value) => {
    this.setState(prev => ({
      newUser: {
        ...prev.newUser,
        [field]: value,
      },
    }))
  }

  updateEditUser = (field, value) => {
    this.setState(prev => ({
      editUser: {
        ...prev.editUser,
        [field]: value,
      },
    }))
  }

  createUser = async (e) => {
    e.preventDefault()
    const { newUser } = this.state

    if (!newUser.username || !newUser.firstname || !newUser.surname || !newUser.email || !newUser.password) {
      Notify({ value: 'Please fill out all required fields.' })
      return
    }

    try {
      let { data } = await axios.post('/api/admin/create-user', newUser)
      if (data && data.success) {
        Notify({ value: data.mssg || 'User created!' })
        this.setState({ newUser: { ...emptyNewUser } })
        this.fetchUsers(1)
        this.fetchStats()
      } else {
        Notify({ value: data.mssg || 'Unable to create user.' })
      }
    } catch (err) {
      Notify({ value: 'Unable to create user.' })
    }
  }

  startEditUser = (user) => {
    this.setState({
      editUser: {
        id: user.id,
        username: user.username || '',
        firstname: user.firstname || '',
        surname: user.surname || '',
        nickname: user.nickname || '',
        email: user.email || '',
        role: user.role || 'user',
        account_status: user.account_status || 'active',
        account_type: user.account_type || 'public',
        password: '',
      },
    })
  }

  cancelEditUser = () => {
    this.setState({ editUser: null })
  }

  saveEditUser = async (e) => {
    e.preventDefault()
    const { editUser, usersPage } = this.state

    if (!editUser) return

    const payload = {
      user_id: editUser.id,
      username: editUser.username,
      firstname: editUser.firstname,
      surname: editUser.surname,
      nickname: editUser.nickname,
      email: editUser.email,
      role: editUser.role,
      account_status: editUser.account_status,
      account_type: editUser.account_type,
    }

    if (editUser.password) {
      payload.password = editUser.password
    }

    try {
      let { data } = await axios.post('/api/admin/update-user', payload)
      if (data && data.success) {
        Notify({ value: data.mssg || 'User updated!' })
        this.setState({ editUser: null })
        this.fetchUsers(usersPage)
        this.fetchStats()
      } else {
        Notify({ value: data.mssg || 'Unable to update user.' })
      }
    } catch (err) {
      Notify({ value: 'Unable to update user.' })
    }
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

  formatNumber = (value) => {
    const num = Number(value) || 0
    return num.toLocaleString()
  }

  renderBarChart = (items) => {
    const values = items.map(item => Number(item.value) || 0)
    const maxValue = Math.max(...values, 1)

    return (
      <div>
        {items.map((item, index) => {
          const value = Number(item.value) || 0
          const pct = Math.round((value / maxValue) * 100)
          const rowStyle = {
            ...styles.chartRow,
            ...(index === items.length - 1 ? styles.chartRowLast : {}),
          }

          return (
            <div key={item.label} style={rowStyle}>
            <div style={styles.chartLabel}>{item.label}</div>
            <div style={styles.chartBarTrack}>
              <div
                style={{
                  ...styles.chartBar,
                    width: `${Math.round((value / maxValue) * 100)}%`,
                  background: item.color,
                }}
              />
            </div>
              <div style={styles.chartValue}>
                {this.formatNumber(value)} ({pct}%)
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  renderPieChart = (items) => {
    const normalized = items.map(item => ({
      label: item.label,
      value: Number(item.value) || 0,
      color: item.color || '#94a3b8',
    }))
    const total = normalized.reduce((sum, item) => sum + item.value, 0)

    let slices = []
    if (total > 0) {
      let acc = 0
      normalized.forEach(item => {
        if (item.value <= 0) return
        const startPct = (acc / total) * 100
        acc += item.value
        const endPct = (acc / total) * 100
        slices.push(`${item.color} ${startPct}% ${endPct}%`)
      })
    }

    const backgroundImage =
      total > 0 && slices.length
        ? `conic-gradient(${slices.join(', ')})`
        : 'conic-gradient(#e2e8f0 0% 100%)'

    return (
      <div style={styles.pieWrap}>
        <div style={{ ...styles.pie, backgroundImage }}>
          <div style={styles.pieCenter}>{this.formatNumber(total)}</div>
        </div>
        <div style={styles.pieLegend}>
          {normalized.map(item => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <div key={item.label} style={styles.pieLegendItem}>
                <span style={{ ...styles.pieSwatch, background: item.color }} />
                <span style={styles.pieLegendLabel}>{item.label}</span>
                <span style={styles.pieLegendValue}>
                  {this.formatNumber(item.value)} ({pct}%)
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  render() {
    let {
      stats,
      loading,
      activeTab,
      pendingPosts,
      users,
      comments,
      newUser,
      editUser,
    } = this.state

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
            {activeTab === 'overview' && stats && (() => {
              const userBars = [
                { label: 'Active', value: stats.users.active, color: '#4caf50' },
                { label: 'Locked', value: stats.users.locked, color: '#ff9800' },
                { label: 'Deleted', value: stats.users.deleted, color: '#f44336' },
                { label: 'Admins', value: stats.users.admins, color: '#8e24aa' },
              ]

              const postBars = [
                { label: 'Approved', value: stats.posts.approved, color: '#4caf50' },
                { label: 'Pending', value: stats.posts.pending, color: '#ff9800' },
                { label: 'Rejected', value: stats.posts.rejected, color: '#f44336' },
              ]

              const interactionBars = [
                { label: 'Comments', value: stats.interactions.comments, color: '#1b9be9' },
                { label: 'Likes', value: stats.interactions.likes, color: '#00bcd4' },
                { label: 'Shares', value: stats.interactions.shares, color: '#9c27b0' },
                { label: 'Follows', value: stats.interactions.follows, color: '#607d8b' },
              ]

              const socialBars = [
                { label: 'Groups', value: stats.interactions.groups, color: '#4caf50' },
                { label: 'Conversations', value: stats.interactions.conversations, color: '#ff9800' },
                { label: 'Notifications', value: stats.interactions.notifications, color: '#f44336' },
              ]

              const friendStats = stats.friend_requests || { total: 0, pending: 0, accepted: 0, rejected: 0 }
              const friendBars = [
                { label: 'Pending', value: friendStats.pending, color: '#ff9800' },
                { label: 'Accepted', value: friendStats.accepted, color: '#4caf50' },
                { label: 'Rejected', value: friendStats.rejected, color: '#f44336' },
              ]

              return (
                <div>
                  <div style={styles.statsGrid}>
                    <div style={{ ...styles.statCard, background: '#e3f2fd' }}>
                      <h3>Users</h3>
                      <p style={styles.statNumber}>{stats.users.total}</p>
                      <small>Active: {stats.users.active} | Locked: {stats.users.locked} | Deleted: {stats.users.deleted}</small>
                      <br/><small>New (7d): {stats.users.new_7d} | Admins: {stats.users.admins}</small>
                    </div>
                    <div style={{ ...styles.statCard, background: '#e8f5e9' }}>
                      <h3>Posts</h3>
                      <p style={styles.statNumber}>{stats.posts.total}</p>
                      <small>Approved: {stats.posts.approved} | Pending: {stats.posts.pending} | Rejected: {stats.posts.rejected}</small>
                      <br/><small>New (7d): {stats.posts.new_7d}</small>
                    </div>
                    <div style={{ ...styles.statCard, background: '#fff3e0' }}>
                      <h3>Interactions</h3>
                      <p style={styles.statNumber}>{stats.interactions.comments + stats.interactions.likes}</p>
                      <small>Comments: {stats.interactions.comments} | Likes: {stats.interactions.likes}</small>
                      <br/><small>Shares: {stats.interactions.shares} | Follows: {stats.interactions.follows}</small>
                    </div>
                    <div style={{ ...styles.statCard, background: '#f3e5f5' }}>
                      <h3>Social</h3>
                      <p style={styles.statNumber}>{stats.interactions.groups}</p>
                      <small>Groups | Conversations: {stats.interactions.conversations}</small>
                      <br/><small>Notifications: {stats.interactions.notifications}</small>
                    </div>
                  </div>

                  <div style={styles.chartsGrid}>
                    <div style={styles.chartCard}>
                      <div style={styles.chartTitle}>User status split</div>
                      {this.renderPieChart(userBars)}
                    </div>
                    <div style={styles.chartCard}>
                      <div style={styles.chartTitle}>Post status</div>
                      {this.renderBarChart(postBars)}
                    </div>
                    <div style={styles.chartCard}>
                      <div style={styles.chartTitle}>Interaction volume</div>
                      {this.renderBarChart(interactionBars)}
                    </div>
                    <div style={styles.chartCard}>
                      <div style={styles.chartTitle}>Social activity</div>
                      {this.renderBarChart(socialBars)}
                    </div>
                    <div style={styles.chartCard}>
                      <div style={styles.chartTitle}>Friend requests</div>
                      {this.renderBarChart(friendBars)}
                    </div>
                  </div>
                </div>
              )
            })()}

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

                <div style={styles.formCard}>
                  <div style={styles.formTitle}>Create user</div>
                  <form style={styles.formGrid} onSubmit={this.createUser}>
                    <input
                      type="text"
                      placeholder="Username"
                      style={styles.formInput}
                      value={newUser.username}
                      onChange={e => this.updateNewUser('username', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="First name"
                      style={styles.formInput}
                      value={newUser.firstname}
                      onChange={e => this.updateNewUser('firstname', e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Surname"
                      style={styles.formInput}
                      value={newUser.surname}
                      onChange={e => this.updateNewUser('surname', e.target.value)}
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      style={styles.formInput}
                      value={newUser.email}
                      onChange={e => this.updateNewUser('email', e.target.value)}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      style={styles.formInput}
                      value={newUser.password}
                      onChange={e => this.updateNewUser('password', e.target.value)}
                      required
                    />
                    <select
                      style={styles.formSelect}
                      value={newUser.role}
                      onChange={e => this.updateNewUser('role', e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      style={styles.formSelect}
                      value={newUser.account_status}
                      onChange={e => this.updateNewUser('account_status', e.target.value)}
                    >
                      <option value="active">Active</option>
                      <option value="locked">Locked</option>
                      <option value="deleted">Deleted</option>
                    </select>
                    <select
                      style={styles.formSelect}
                      value={newUser.account_type}
                      onChange={e => this.updateNewUser('account_type', e.target.value)}
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                    <div style={styles.formActions}>
                      <button type="submit" style={styles.btnSuccess}>Create</button>
                    </div>
                  </form>
                </div>

                {editUser && (
                  <div style={styles.formCard}>
                    <div style={styles.formTitle}>Edit user</div>
                    <form style={styles.formGrid} onSubmit={this.saveEditUser}>
                      <input
                        type="text"
                        placeholder="Username"
                        style={styles.formInput}
                        value={editUser.username}
                        onChange={e => this.updateEditUser('username', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="First name"
                        style={styles.formInput}
                        value={editUser.firstname}
                        onChange={e => this.updateEditUser('firstname', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Surname"
                        style={styles.formInput}
                        value={editUser.surname}
                        onChange={e => this.updateEditUser('surname', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Nickname"
                        style={styles.formInput}
                        value={editUser.nickname}
                        onChange={e => this.updateEditUser('nickname', e.target.value)}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        style={styles.formInput}
                        value={editUser.email}
                        onChange={e => this.updateEditUser('email', e.target.value)}
                        required
                      />
                      <input
                        type="password"
                        placeholder="New password (optional)"
                        style={styles.formInput}
                        value={editUser.password}
                        onChange={e => this.updateEditUser('password', e.target.value)}
                      />
                      <select
                        style={styles.formSelect}
                        value={editUser.role}
                        onChange={e => this.updateEditUser('role', e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <select
                        style={styles.formSelect}
                        value={editUser.account_status}
                        onChange={e => this.updateEditUser('account_status', e.target.value)}
                      >
                        <option value="active">Active</option>
                        <option value="locked">Locked</option>
                        <option value="deleted">Deleted</option>
                      </select>
                      <select
                        style={styles.formSelect}
                        value={editUser.account_type}
                        onChange={e => this.updateEditUser('account_type', e.target.value)}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                      <div style={styles.formActions}>
                        <button type="submit" style={styles.btnSuccess}>Save</button>
                        <button type="button" style={styles.btnWarning} onClick={this.cancelEditUser}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

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
                          <button style={styles.btnInfo} onClick={() => this.startEditUser(u)}>Edit</button>
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
                      p.imgSrc.match(/\.(mp4|webm|mov|ogg|mkv)$/i) ? (
                        <video
                          src={`/posts/${p.imgSrc}`}
                          style={{...styles.postImage, width: '100%', maxHeight: '400px'}}
                          controls
                        />
                      ) : (
                        <img
                          src={`/posts/${p.imgSrc}`}
                          alt="Post"
                          style={styles.postImage}
                        />
                      )
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
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '15px', marginTop: '20px' },
  statCard: {
    padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  statNumber: { fontSize: '36px', fontWeight: 'bold', margin: '10px 0', color: '#333' },
  chartCard: {
    padding: '16px',
    borderRadius: '8px',
    background: '#f9fafb',
    border: '1px solid #e3e8ef',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
    backgroundImage:
      'linear-gradient(180deg, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    fontFamily:
      "'IBM Plex Mono', 'Fira Code', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  chartTitle: {
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#1f2937',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  chartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    paddingBottom: '6px',
    borderBottom: '1px dashed #e1e7ef',
  },
  chartRowLast: { borderBottom: 'none', marginBottom: '0', paddingBottom: '0' },
  chartLabel: {
    width: '110px',
    fontSize: '11px',
    color: '#6b7280',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  chartBarTrack: {
    flex: 1,
    height: '8px',
    background: '#eef2f7',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundImage:
      'linear-gradient(90deg, rgba(15,23,42,0.08) 1px, transparent 1px)',
    backgroundSize: '12px 100%',
  },
  chartBar: { height: '8px', borderRadius: '6px', boxShadow: '0 0 0 1px rgba(15,23,42,0.08)' },
  chartValue: {
    minWidth: '80px',
    textAlign: 'right',
    fontSize: '11px',
    color: '#111827',
    fontVariantNumeric: 'tabular-nums',
  },
  pieWrap: { display: 'flex', gap: '12px', alignItems: 'center' },
  pie: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(15,23,42,0.1)',
  },
  pieCenter: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '600',
    color: '#111827',
    fontVariantNumeric: 'tabular-nums',
  },
  pieLegend: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  pieLegendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  pieSwatch: { width: '10px', height: '10px', borderRadius: '2px' },
  pieLegendLabel: { fontSize: '11px', color: '#6b7280', width: '70px' },
  pieLegendValue: { fontSize: '11px', color: '#111827', fontVariantNumeric: 'tabular-nums' },
  filterBar: { display: 'flex', gap: '10px', marginBottom: '15px' },
  formCard: { border: '1px solid #eee', borderRadius: '8px', padding: '15px', marginBottom: '15px', background: '#fafafa' },
  formTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#444' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', alignItems: 'center' },
  formInput: { padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '100%' },
  formSelect: { padding: '8px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px', width: '100%' },
  formActions: { display: 'flex', gap: '8px', alignItems: 'center' },
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
  btnInfo: {
    padding: '5px 10px', background: '#2196f3', color: '#fff', border: 'none',
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
