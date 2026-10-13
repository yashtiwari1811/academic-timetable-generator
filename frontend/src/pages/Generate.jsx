import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api.js'

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const EMPTY_FIXED = { subject_code: '', faculty_name: '', room_name: '', day: 'Monday', start: '09:00', end: '10:00', type: 'theory', batch: '' }

export default function Generate() {
  const [univs,       setUnivs]       = useState([])
  const [univId,      setUnivId]      = useState('')
  const [progs,       setProgs]       = useState([])
  const [selProgs,    setSelProgs]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState(null)
  const [fixedList,   setFixedList]   = useState([])
  const [showFixed,   setShowFixed]   = useState(false)
  const [fixedForm,   setFixedForm]   = useState(EMPTY_FIXED)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/universities').then(r => {
      setUnivs(r.data)
      if (r.data.length) setUnivId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (univId) api.get(`/programmes?university_id=${univId}`).then(r => {
      setProgs(r.data)
      setSelProgs(r.data.map(p => p.id))   // all selected by default
    })
  }, [univId])

  function toggleProg(pid) {
    setSelProgs(prev =>
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]
    )
  }

  function addFixed() {
    if (!fixedForm.subject_code || !fixedForm.day || !fixedForm.start || !fixedForm.end) return
    const entry = {
      ...fixedForm,
      batch: fixedForm.batch !== '' ? parseInt(fixedForm.batch) : null,
      start_min: 0, end_min: 0,
      subject_id: `fixed_${Date.now()}`,
      programme_id: '', programme_name: 'Fixed',
      room_id: `fixed_room_${Date.now()}`,
    }
    setFixedList(prev => [...prev, entry])
    setFixedForm(EMPTY_FIXED)
  }

  async function generate() {
    setLoading(true); setResult(null); setError(null)
    try {
      const res = await api.post('/timetables/generate', {
        university_id: univId,
        programme_ids: selProgs,
        fixed_sessions: fixedList,
      })
      setResult(res.data)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
    setLoading(false)
  }

  const statusColor = s => ({ success: 'success', partial: 'warning', failed: 'danger' }[s] || 'muted')

  return (
    <div>
      <div className="page-heading">
        <h2>Generate Timetable</h2>
        <p>Select a university and programmes, then run the automated constraint-based scheduler.</p>
      </div>

      <div className="card">
        <div className="card-title">Scheduler Configuration</div>

        <div className="form-group">
          <label>University</label>
          <select className="form-control" style={{ maxWidth: 320 }} value={univId} onChange={e => setUnivId(e.target.value)}>
            {univs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Programmes to Schedule</label>
          {progs.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No programmes found for this university.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {progs.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={selProgs.includes(p.id)} onChange={() => toggleProg(p.id)} />
                  <span><strong>{p.name}</strong> — Semester {p.semester}, {p.strength} students, {p.batches} batches</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={generate}
          disabled={loading || selProgs.length === 0}
          style={{ marginTop: 8 }}
        >
          {loading ? '⏳ Generating…' : '⚡ Generate Timetable'}
        </button>
      </div>

      {/* Fixed sessions */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ marginBottom: 0 }}>
            Fixed Sessions
            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
              Pre-assigned slots that the scheduler will not move
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowFixed(v => !v)}>
            {showFixed ? 'Hide' : '+ Add Fixed Session'}
          </button>
        </div>

        {showFixed && (
          <div style={{ marginTop: 14, padding: '14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div className="form-row-3">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Subject Code</label>
                <input className="form-control" value={fixedForm.subject_code}
                  onChange={e => setFixedForm(f => ({ ...f, subject_code: e.target.value }))} placeholder="DFIS101" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Faculty Name</label>
                <input className="form-control" value={fixedForm.faculty_name}
                  onChange={e => setFixedForm(f => ({ ...f, faculty_name: e.target.value }))} placeholder="Dr. Alice" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Room</label>
                <input className="form-control" value={fixedForm.room_name}
                  onChange={e => setFixedForm(f => ({ ...f, room_name: e.target.value }))} placeholder="Room A101" />
              </div>
            </div>
            <div className="form-row" style={{ marginTop: 10 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Day</label>
                <select className="form-control" value={fixedForm.day}
                  onChange={e => setFixedForm(f => ({ ...f, day: e.target.value }))}>
                  {DAYS_ORDER.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start</label>
                <input type="time" className="form-control" value={fixedForm.start}
                  onChange={e => setFixedForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End</label>
                <input type="time" className="form-control" value={fixedForm.end}
                  onChange={e => setFixedForm(f => ({ ...f, end: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Type</label>
                <select className="form-control" value={fixedForm.type}
                  onChange={e => setFixedForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Batch (optional)</label>
                <input type="number" className="form-control" value={fixedForm.batch} min={1}
                  onChange={e => setFixedForm(f => ({ ...f, batch: e.target.value }))} placeholder="—" />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={addFixed}>
              + Add to Fixed List
            </button>
          </div>
        )}

        {fixedList.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: showFixed ? 12 : 0 }}>No fixed sessions. All slots will be assigned freely.</p>
        ) : (
          <div className="item-list" style={{ marginTop: 12 }}>
            {fixedList.map((f, i) => (
              <div key={i} className="item-row">
                <div className="item-info">
                  <div className="item-name">{f.subject_code} <span className={`badge badge-${f.type}`}>{f.type}</span>{f.batch ? ` · Batch ${f.batch}` : ''}</div>
                  <div className="item-meta">{f.day} {f.start}–{f.end} · {f.faculty_name} · {f.room_name}</div>
                </div>
                <button className="btn btn-danger btn-xs" onClick={() => setFixedList(prev => prev.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">Error: {error}</div>}

      {result && (
        <>
          <div className={`alert alert-${statusColor(result.status)}`}>
            <strong>Status: {result.status.toUpperCase()}</strong> — {result.sessions.length} session(s) scheduled.
            {result.status === 'success' && ' All constraints satisfied.'}
            {result.status === 'partial' && ' Some sessions could not be placed — see conflicts below.'}
            {result.status === 'failed' && ' No sessions could be scheduled — see conflicts below.'}
          </div>

          {result.conflicts?.length > 0 && (
            <div className="card">
              <div className="card-title">⚠ Scheduling Conflicts ({result.conflicts.length})</div>
              <ul className="conflict-list">
                {result.conflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12 }}>
                Revise your inputs (faculty availability, room capacity, subject requirements) and regenerate.
              </p>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ marginBottom: 0 }}>
                Generated Sessions ({result.sessions.length})
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {result.status !== 'failed' && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate(`/timetables/${result.id}`)}>
                    View Full Timetable →
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Day</th><th>Time</th><th>Subject</th><th>Type</th><th>Faculty</th><th>Room</th><th>Batch</th></tr>
                </thead>
                <tbody>
                  {result.sessions.map((s, i) => (
                    <tr key={i}>
                      <td>{s.day}</td>
                      <td>{s.start}–{s.end}</td>
                      <td><strong>{s.subject_code}</strong> {s.subject_name}</td>
                      <td><span className={`badge badge-${s.type}`}>{s.type}</span></td>
                      <td>{s.faculty_name}</td>
                      <td>{s.room_name}</td>
                      <td>{s.batch != null ? `Batch ${s.batch}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
