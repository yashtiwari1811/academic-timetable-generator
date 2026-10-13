import { useEffect, useState } from 'react'
import api from '../api.js'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT = {
  name: 'Demo University',
  working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  start_time: '09:00',
  end_time: '17:00',
  period_duration: 60,
  breaks: [{ label: 'Lunch', start: '13:00', end: '14:00' }],
}

export default function UniversitySetup() {
  const [univs, setUnivs] = useState([])
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.get('/universities').then(r => {
      setUnivs(r.data)
      if (r.data.length) { setSelected(r.data[0]); setForm(r.data[0]) }
    })
  }, [])

  function toggleDay(day) {
    setForm(f => {
      const days = f.working_days.includes(day)
        ? f.working_days.filter(d => d !== day)
        : [...f.working_days, day]
      return { ...f, working_days: days }
    })
  }

  function setBreak(idx, key, val) {
    setForm(f => {
      const breaks = [...f.breaks]
      breaks[idx] = { ...breaks[idx], [key]: val }
      return { ...f, breaks }
    })
  }

  function addBreak() {
    setForm(f => ({ ...f, breaks: [...f.breaks, { label: '', start: '12:00', end: '13:00' }] }))
  }

  function removeBreak(idx) {
    setForm(f => ({ ...f, breaks: f.breaks.filter((_, i) => i !== idx) }))
  }

  async function save() {
    setSaving(true); setMsg(null)
    try {
      let res
      if (selected) {
        res = await api.put(`/universities/${selected.id}`, form)
      } else {
        res = await api.post('/universities', form)
      }
      const updated = res.data
      setSelected(updated)
      setUnivs(prev => {
        const idx = prev.findIndex(u => u.id === updated.id)
        return idx >= 0 ? prev.map(u => u.id === updated.id ? updated : u) : [...prev, updated]
      })
      setMsg({ type: 'success', text: 'University configuration saved.' })
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e.message })
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="page-heading">
        <h2>University Configuration</h2>
        <p>Set working days, hours, period duration and scheduled breaks.</p>
      </div>

      {univs.length > 1 && (
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label>Select University</label>
          <select className="form-control" value={selected?.id || ''} onChange={e => {
            const u = univs.find(x => x.id === e.target.value)
            setSelected(u); setForm(u)
          }}>
            {univs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      )}

      <div className="card">
        <div className="card-title">Basic Info</div>
        <div className="form-group">
          <label>University Name</label>
          <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>

        <div className="form-group">
          <label>Working Days</label>
          <div className="day-strip" style={{ marginTop: 6 }}>
            {DAYS.map(d => (
              <div key={d} className={'day-chip' + (form.working_days?.includes(d) ? ' active' : '')} onClick={() => toggleDay(d)}>
                {d.slice(0, 3)}
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Time</label>
            <input type="time" className="form-control" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>End Time</label>
            <input type="time" className="form-control" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
          </div>
        </div>

        <div className="form-group" style={{ maxWidth: 200 }}>
          <label>Period Duration (minutes)</label>
          <input type="number" className="form-control" value={form.period_duration} min={30} max={180} step={15}
            onChange={e => setForm(f => ({ ...f, period_duration: parseInt(e.target.value) }))} />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ marginBottom: 0 }}>Scheduled Breaks</div>
          <button className="btn btn-secondary btn-sm" onClick={addBreak}>+ Add Break</button>
        </div>
        {(form.breaks || []).length === 0 && <p style={{ fontSize: 13, color: 'var(--muted)' }}>No breaks configured.</p>}
        {(form.breaks || []).map((b, i) => (
          <div key={i} className="form-row" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Break Label</label>
              <input className="form-control" value={b.label} onChange={e => setBreak(i, 'label', e.target.value)} placeholder="e.g. Lunch" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Start</label>
              <input type="time" className="form-control" value={b.start} onChange={e => setBreak(i, 'start', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>End</label>
              <input type="time" className="form-control" value={b.end} onChange={e => setBreak(i, 'end', e.target.value)} />
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginBottom: 0 }} onClick={() => removeBreak(i)}>Remove</button>
          </div>
        ))}
      </div>

      {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : '💾 Save Configuration'}
      </button>
    </div>
  )
}
