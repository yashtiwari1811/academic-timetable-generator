import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api.js'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/universities'),
      api.get('/programmes'),
      api.get('/subjects'),
      api.get('/faculty'),
      api.get('/rooms'),
      api.get('/timetables'),
    ]).then(([u, p, s, f, r, t]) => {
      const tts = t.data
      setStats({
        universities: u.data.length,
        programmes:   p.data.length,
        subjects:     s.data.length,
        faculty:      f.data.length,
        rooms:        r.data.length,
        timetables:   tts.length,
        published:    tts.filter(x => x.published).length,
        conflicts:    tts.reduce((acc, x) => acc + (x.conflicts?.length || 0), 0),
      })
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="spinner-wrap"><div className="spinner"/><span className="spinner-text">Loading...</span></div>

  return (
    <div>
      <div className="page-heading">
        <h2>Dashboard</h2>
        <p>Overview of your timetable system configuration and scheduling status.</p>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="label">Programmes</div>
          <div className="value">{stats.programmes}</div>
          <div className="sub">{stats.subjects} subjects total</div>
        </div>
        <div className="stat-card">
          <div className="label">Faculty</div>
          <div className="value">{stats.faculty}</div>
          <div className="sub">across {stats.universities} university</div>
        </div>
        <div className="stat-card">
          <div className="label">Rooms & Labs</div>
          <div className="value">{stats.rooms}</div>
          <div className="sub">classrooms + laboratories</div>
        </div>
        <div className="stat-card">
          <div className="label">Timetables</div>
          <div className="value">{stats.timetables}</div>
          <div className="sub">{stats.published} published</div>
        </div>
      </div>

      {stats.conflicts > 0 && (
        <div className="alert alert-warning">
          ⚠ There are <strong>{stats.conflicts} unresolved conflict(s)</strong> across generated timetables.
          Review them in the <Link to="/timetables">Timetables</Link> section.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-title">Quick Start</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { to: '/university', icon: '🏛', label: 'Configure University', desc: 'Set working hours, days, breaks' },
              { to: '/programmes', icon: '🎓', label: 'Add Programmes', desc: 'Define departments and semesters' },
              { to: '/subjects',   icon: '📚', label: 'Add Subjects',   desc: 'Theory + practical requirements' },
              { to: '/faculty',    icon: '👩‍🏫', label: 'Add Faculty',    desc: 'Availability and assignments' },
              { to: '/rooms',      icon: '🚪', label: 'Add Rooms',      desc: 'Classrooms and laboratories' },
              { to: '/generate',   icon: '⚡', label: 'Generate',       desc: 'Run the auto-scheduler' },
            ].map(({ to, icon, label, desc }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <div className="item-row" style={{ cursor: 'pointer' }}>
                  <div className="item-info">
                    <div className="item-name">{icon} {label}</div>
                    <div className="item-meta">{desc}</div>
                  </div>
                  <span style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Constraint Rules</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            {[
              'Sessions within university working hours',
              'Faculty only scheduled on available days',
              'No double-booking: faculty, room, or student group',
              'Whole-class sessions cannot overlap practicals',
              'Room capacity meets class/batch strength',
              'Practicals use labs with consecutive periods',
              'Each subject gets required weekly sessions',
              'Fixed sessions remain in their assigned slots',
            ].map((r, i) => (
              <li key={i} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>C{i + 1}</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
