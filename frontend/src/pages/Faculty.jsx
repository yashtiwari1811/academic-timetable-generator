import { useEffect, useState } from 'react'
import api from '../api.js'

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const EMPTY = { name: '', availability: [] }

export default function Faculty() {
  const [univs,  setUnivs]  = useState([])
  const [univId, setUnivId] = useState('')
  const [list,   setList]   = useState([])
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState(null)

  useEffect(() => {
    api.get('/universities').then(r => {
      setUnivs(r.data)
      if (r.data.length) setUnivId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (univId) api.get(`/faculty?university_id=${univId}`).then(r => setList(r.data))
  }, [univId])

  function toggleDay(day) {
    // availability stored as "MON:09-17" style
    const tag = `${day}:09-17`
    setForm(f => {
      const av = f.availability.includes(tag)
        ? f.availability.filter(x => x !== tag)
        : [...f.availability, tag]
      return { ...f, availability: av }
    })
  }

  function isDayActive(day) { return form.availability.some(a => a.startsWith(day + ':')) }

  function openAdd() { setForm(EMPTY); setEditId(null); setModal('add'); setMsg(null) }
  function openEdit(f) {
    setForm({ name: f.name, availability: [...(f.availability || [])] })
    setEditId(f.id); setModal('edit'); setMsg(null)
  }

  async function remove(fid) {
    await api.delete(`/faculty/${fid}`)
    setList(prev => prev.filter(x => x.id !== fid))
  }

  async function save() {
    setSaving(true); setMsg(null)
    const body = { ...form, university_id: univId }
    try {
      let res
      if (editId) {
        res = await api.put(`/faculty/${editId}`, body)
        setList(prev => prev.map(x => x.id === editId ? res.data : x))
      } else {
        res = await api.post('/faculty', body)
        setList(prev => [...prev, res.data])
      }
      setModal(null)
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message)
    }
    setSaving(false)
  }

  const dayLabel = av => {
    const days = av.map(a => a.split(':')[0])
    return days.join(', ') || 'No availability set'
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Faculty</h2>
        <p>Add faculty members and configure their weekly availability.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select className="form-control" style={{ width: 240 }} value={univId} onChange={e => setUnivId(e.target.value)}>
          {univs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Faculty</button>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">👩‍🏫</div>
          <div className="es-title">No faculty yet</div>
          <div className="es-sub">Add faculty members and their availability.</div>
        </div>
      ) : (
        <div className="item-list">
          {list.map(f => (
            <div key={f.id} className="item-row">
              <div className="item-info">
                <div className="item-name">{f.name}</div>
                <div className="item-meta">Available: {dayLabel(f.availability || [])}</div>
              </div>
              <div className="item-actions">
                <button className="btn btn-secondary btn-xs" onClick={() => openEdit(f)}>Edit</button>
                <button className="btn btn-danger btn-xs" onClick={() => remove(f.id)}>Del</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? 'Add Faculty' : 'Edit Faculty'}</div>
            <div className="form-group">
              <label>Name</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Alice" />
            </div>
            <div className="form-group">
              <label>Available Days</label>
              <div className="avail-grid" style={{ marginTop: 6 }}>
                {DAYS.map(d => (
                  <div key={d} className={'avail-chip' + (isDayActive(d) ? ' selected' : '')} onClick={() => toggleDay(d)}>
                    {d}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Click to toggle available days (9am–5pm assumed).</div>
            </div>
            {msg && <div className="alert alert-error">{msg}</div>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
