import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api.js'

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function buildGrid(sessions) {
  const times = [...new Set(sessions.map(s => `${s.start}–${s.end}`))].sort()
  const days  = [...new Set(sessions.map(s => s.day))].sort(
    (a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b)
  )
  const grid = {}
  for (const day of days) {
    grid[day] = {}
    for (const t of times) grid[day][t] = []
  }
  for (const s of sessions) {
    const t = `${s.start}–${s.end}`
    if (grid[s.day]?.[t]) grid[s.day][t].push(s)
  }
  return { times, days, grid }
}

function TimetableGrid({ sessions, view, filterVal, onCellClick }) {
  let filtered = sessions
  if (view === 'programme' && filterVal) filtered = sessions.filter(s => s.programme_id === filterVal)
  if (view === 'faculty'   && filterVal) filtered = sessions.filter(s => s.faculty_id === filterVal)
  if (view === 'room'      && filterVal) filtered = sessions.filter(s => s.room_id === filterVal)

  if (!filtered.length) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>No sessions to display.</p>

  const { times, days, grid } = buildGrid(filtered)

  return (
    <div className="tt-grid">
      <table className="tt-table">
        <thead>
          <tr>
            <th>Time</th>
            {days.map(d => <th key={d}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {times.map(t => (
            <tr key={t}>
              <td className="time-col">{t}</td>
              {days.map(d => (
                <td key={d}>
                  {(grid[d]?.[t] || []).map((s, i) => (
                    <div
                      key={i}
                      className={`tt-cell ${s.type}`}
                      style={{ cursor: onCellClick ? 'pointer' : 'default' }}
                      title={onCellClick ? 'Click to adjust this session' : ''}
                      onClick={() => onCellClick && onCellClick(s)}
                    >
                      <div className="subj">{s.subject_code}</div>
                      <div className="fac">{s.faculty_name}</div>
                      <div className="room">{s.room_name}</div>
                      {s.batch != null && <div className="batch">Batch {s.batch}</div>}
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Adjust Session Modal ───────────────────────────────────────────────────────
function AdjustModal({ session, sessionIdx, ttId, rooms, onSave, onClose }) {
  const [day,   setDay]   = useState(session.day)
  const [start, setStart] = useState(session.start)
  const [end,   setEnd]   = useState(session.end)
  const [room,  setRoom]  = useState(session.room_id)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(null)

  async function save() {
    setSaving(true); setConflict(null)
    const roomObj = rooms.find(r => r.id === room)
    try {
      const res = await api.put(`/timetables/${ttId}/sessions/${sessionIdx}`, {
        day, start, end,
        room_id: room,
        room_name: roomObj?.name || session.room_name,
      })
      if (res.data.conflict) {
        setConflict(res.data.conflict)
      } else {
        onSave(res.data.session)
      }
    } catch (e) {
      setConflict(e?.response?.data?.error || e.message)
    }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          Adjust Session — <span style={{ color: 'var(--accent)' }}>{session.subject_code}</span>
          <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{session.type}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Faculty: {session.faculty_name}{session.batch != null ? ` · Batch ${session.batch}` : ''}
        </div>

        <div className="form-group">
          <label>Day</label>
          <select className="form-control" value={day} onChange={e => setDay(e.target.value)}>
            {DAYS_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Time</label>
            <input type="time" className="form-control" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label>End Time</label>
            <input type="time" className="form-control" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Room / Lab</label>
          <select className="form-control" value={room} onChange={e => setRoom(e.target.value)}>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type}, cap {r.capacity})</option>)}
          </select>
        </div>

        {conflict && (
          <div className="alert alert-error">
            ⚠ Conflict detected: {conflict}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Checking…' : 'Apply Change'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Print / Export ─────────────────────────────────────────────────────────────
function printTimetable(tt, view, filterVal, programmes, faculties, rooms_list) {
  let sessions = tt.sessions
  let title = tt.id
  if (view === 'programme' && filterVal) {
    sessions = sessions.filter(s => s.programme_id === filterVal)
    title = programmes.find(p => p.id === filterVal)?.name || title
  }
  if (view === 'faculty' && filterVal) {
    sessions = sessions.filter(s => s.faculty_id === filterVal)
    title = faculties.find(f => f.id === filterVal)?.name || title
  }
  if (view === 'room' && filterVal) {
    sessions = sessions.filter(s => s.room_id === filterVal)
    title = rooms_list.find(r => r.id === filterVal)?.name || title
  }

  const times = [...new Set(sessions.map(s => `${s.start}–${s.end}`))].sort()
  const days  = [...new Set(sessions.map(s => s.day))].sort(
    (a, b) => DAYS_ORDER.indexOf(a) - DAYS_ORDER.indexOf(b)
  )
  const grid = {}
  for (const day of days) { grid[day] = {}; for (const t of times) grid[day][t] = [] }
  for (const s of sessions) { const t = `${s.start}–${s.end}`; if (grid[s.day]?.[t]) grid[s.day][t].push(s) }

  const rows = times.map(t => `
    <tr>
      <td class="time">${t}</td>
      ${days.map(d => {
        const cells = (grid[d]?.[t] || [])
        if (!cells.length) return '<td></td>'
        return `<td>${cells.map(s => `
          <div class="cell ${s.type}">
            <b>${s.subject_code}</b><br>${s.subject_name}<br>
            <span>${s.faculty_name}</span><br>
            <span>${s.room_name}${s.batch != null ? ` · Batch ${s.batch}` : ''}</span>
          </div>`).join('')}</td>`
      }).join('')}
    </tr>`).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Timetable — ${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #111; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      p  { font-size: 11px; color: #666; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #1a7f64; color: #fff; padding: 8px 10px; text-align: center; font-size: 12px; }
      td { border: 1px solid #ccc; padding: 4px; vertical-align: top; min-width: 90px; }
      .time { font-weight: 600; background: #f5f5f5; text-align: center; white-space: nowrap; }
      .cell { padding: 4px 5px; border-radius: 3px; margin-bottom: 3px; font-size: 11px; line-height: 1.4; }
      .cell.theory    { background: #e0f5ef; }
      .cell.practical { background: #ede0fa; }
      .cell span { color: #555; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>
    <h1>Academic Timetable — ${title}</h1>
    <p>Generated: ${new Date().toLocaleString()} · ${sessions.length} sessions</p>
    <table>
      <thead><tr><th>Time</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}

function exportCSV(tt) {
  const header = ['Day', 'Start', 'End', 'Subject Code', 'Subject Name', 'Type', 'Faculty', 'Room', 'Programme', 'Batch']
  const rows = tt.sessions.map(s => [
    s.day, s.start, s.end, s.subject_code, s.subject_name, s.type,
    s.faculty_name, s.room_name, s.programme_name, s.batch != null ? `Batch ${s.batch}` : ''
  ])
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `timetable_${tt.id}.csv`; a.click()
  URL.revokeObjectURL(url)
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TimetableView() {
  const { tid } = useParams()
  const navigate = useNavigate()
  const [list,        setList]        = useState([])
  const [tt,          setTt]          = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [view,        setView]        = useState('all')
  const [filterVal,   setFilterVal]   = useState('')
  const [publishing,  setPublishing]  = useState(false)
  const [msg,         setMsg]         = useState(null)
  const [adjustSess,  setAdjustSess]  = useState(null)   // { session, idx }
  const [allRooms,    setAllRooms]    = useState([])

  useEffect(() => {
    api.get('/timetables').then(r => setList(r.data))
    api.get('/rooms').then(r => setAllRooms(r.data))
  }, [])

  useEffect(() => {
    if (!tid) { setTt(null); return }
    setLoading(true)
    api.get(`/timetables/${tid}`).then(r => setTt(r.data)).finally(() => setLoading(false))
  }, [tid])

  async function publish() {
    setPublishing(true); setMsg(null)
    try {
      const res = await api.put(`/timetables/${tt.id}/publish`)
      setTt(res.data)
      setMsg({ type: 'success', text: 'Timetable published successfully.' })
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e.message })
    }
    setPublishing(false)
  }

  function handleCellClick(session) {
    const idx = tt.sessions.findIndex(
      s => s.subject_id === session.subject_id &&
           s.day === session.day &&
           s.start === session.start &&
           s.batch === session.batch
    )
    if (idx >= 0) setAdjustSess({ session, idx })
  }

  function handleAdjustSave(updatedSession) {
    setTt(prev => {
      const sessions = [...prev.sessions]
      sessions[adjustSess.idx] = updatedSession
      return { ...prev, sessions }
    })
    setAdjustSess(null)
    setMsg({ type: 'success', text: 'Session updated. No conflicts detected.' })
  }

  const programmes = tt ? [...new Map(tt.sessions.map(s => [s.programme_id, s.programme_name])).entries()].map(([id, name]) => ({ id, name })) : []
  const faculties  = tt ? [...new Map(tt.sessions.map(s => [s.faculty_id,   s.faculty_name  ])).entries()].map(([id, name]) => ({ id, name })) : []
  const rooms_list = tt ? [...new Map(tt.sessions.map(s => [s.room_id,      s.room_name     ])).entries()].map(([id, name]) => ({ id, name })) : []

  const statusBadge = s => {
    if (s === 'success') return <span className="badge badge-success">✓ Success</span>
    if (s === 'partial') return <span className="badge badge-warning">⚠ Partial</span>
    return <span className="badge badge-danger">✗ Failed</span>
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Timetables</h2>
        <p>View, adjust, export and publish generated timetables.</p>
      </div>

      {/* List */}
      <div className="card">
        <div className="card-title">All Generated Timetables ({list.length})</div>
        {list.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="es-icon">📭</div>
            <div className="es-title">No timetables yet</div>
            <div className="es-sub"><Link to="/generate">Generate one →</Link></div>
          </div>
        ) : (
          <div className="item-list">
            {list.map(t => (
              <div key={t.id} className="item-row"
                style={{ cursor: 'pointer', borderColor: tid === t.id ? 'var(--accent)' : '' }}
                onClick={() => navigate(`/timetables/${t.id}`)}>
                <div className="item-info">
                  <div className="item-name">
                    {t.id}
                    {t.published && <span className="badge badge-success" style={{ marginLeft: 6 }}>Published</span>}
                  </div>
                  <div className="item-meta">{t.sessions?.length} sessions · {t.conflicts?.length} conflict(s)</div>
                </div>
                {statusBadge(t.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="spinner-wrap"><div className="spinner"/><span className="spinner-text">Loading timetable…</span></div>}

      {tt && !loading && (
        <>
          {tt.published && (
            <div className="publish-banner">
              <div>
                <div className="pb-text">✓ This timetable is published</div>
                <div className="pb-sub">Visible to all stakeholders.</div>
              </div>
            </div>
          )}

          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

          {tt.conflicts?.length > 0 && (
            <div className="card">
              <div className="card-title">⚠ Unresolved Conflicts ({tt.conflicts.length})</div>
              <ul className="conflict-list">
                {tt.conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}

          {/* Grid card */}
          <div className="card">
            <div className="card-header">
              <div className="tabs" style={{ margin: 0, borderBottom: 'none' }}>
                {[
                  ['all',       'All Sessions'],
                  ['programme', 'By Programme'],
                  ['faculty',   'By Faculty'],
                  ['room',      'By Room / Lab'],
                ].map(([v, l]) => (
                  <button key={v} className={`tab ${view === v ? 'active' : ''}`}
                    onClick={() => { setView(v); setFilterVal('') }}>{l}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm"
                  title="Export timetable as CSV"
                  onClick={() => exportCSV(tt)}>
                  ⬇ CSV
                </button>
                <button className="btn btn-secondary btn-sm"
                  title="Print / save as PDF"
                  onClick={() => printTimetable(tt, view, filterVal, programmes, faculties, rooms_list)}>
                  🖨 Print
                </button>
                {!tt.published && (
                  <button className="btn btn-primary btn-sm" onClick={publish} disabled={publishing}>
                    {publishing ? 'Publishing…' : '🚀 Publish'}
                  </button>
                )}
              </div>
            </div>

            {view === 'programme' && (
              <div className="form-group" style={{ maxWidth: 300, marginBottom: 16 }}>
                <select className="form-control" value={filterVal} onChange={e => setFilterVal(e.target.value)}>
                  <option value="">— All Programmes —</option>
                  {programmes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            {view === 'faculty' && (
              <div className="form-group" style={{ maxWidth: 300, marginBottom: 16 }}>
                <select className="form-control" value={filterVal} onChange={e => setFilterVal(e.target.value)}>
                  <option value="">— All Faculty —</option>
                  {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            {view === 'room' && (
              <div className="form-group" style={{ maxWidth: 300, marginBottom: 16 }}>
                <select className="form-control" value={filterVal} onChange={e => setFilterVal(e.target.value)}>
                  <option value="">— All Rooms —</option>
                  {rooms_list.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
              💡 Click any session cell to manually adjust its slot or room.
            </div>

            <TimetableGrid
              sessions={tt.sessions}
              view={view}
              filterVal={filterVal}
              onCellClick={handleCellClick}
            />
          </div>

          {/* Session list */}
          <div className="card">
            <div className="card-title">Session List ({tt.sessions.length})</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Day</th><th>Time</th><th>Subject</th><th>Type</th><th>Faculty</th><th>Room</th><th>Batch</th><th></th></tr>
                </thead>
                <tbody>
                  {tt.sessions.map((s, i) => (
                    <tr key={i}>
                      <td>{s.day}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{s.start}–{s.end}</td>
                      <td><strong>{s.subject_code}</strong> {s.subject_name}</td>
                      <td><span className={`badge badge-${s.type}`}>{s.type}</span></td>
                      <td>{s.faculty_name}</td>
                      <td>{s.room_name}</td>
                      <td>{s.batch != null ? `Batch ${s.batch}` : '—'}</td>
                      <td>
                        <button className="btn btn-secondary btn-xs"
                          onClick={() => setAdjustSess({ session: s, idx: i })}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Adjust modal */}
      {adjustSess && (
        <AdjustModal
          session={adjustSess.session}
          sessionIdx={adjustSess.idx}
          ttId={tt.id}
          rooms={allRooms}
          onSave={handleAdjustSave}
          onClose={() => setAdjustSess(null)}
        />
      )}
    </div>
  )
}
