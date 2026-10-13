import { useEffect, useState } from 'react'
import api from '../api.js'

const EMPTY = { name: '', semester: 1, strength: 30, batches: 1 }

export default function Programmes() {
  const [univs, setUnivs]     = useState([])
  const [univId, setUnivId]   = useState('')
  const [list, setList]       = useState([])
  const [modal, setModal]     = useState(null)  // null | 'add' | 'edit'
  const [form, setForm]       = useState(EMPTY)
  const [editId, setEditId]   = useState(null)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState(null)

  useEffect(() => {
    api.get('/universities').then(r => {
      setUnivs(r.data)
      if (r.data.length) setUnivId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (univId) api.get(`/programmes?university_id=${univId}`).then(r => setList(r.data))
  }, [univId])

  function openAdd() { setForm(EMPTY); setEditId(null); setModal('add'); setMsg(null) }
  function openEdit(p) { setForm({ name: p.name, semester: p.semester, strength: p.strength, batches: p.batches }); setEditId(p.id); setModal('edit'); setMsg(null) }

  async function save() {
    setSaving(true); setMsg(null)
    const body = { ...form, university_id: univId }
    try {
      let res
      if (editId) {
        res = await api.put(`/programmes/${editId}`, body)
        setList(prev => prev.map(x => x.id === editId ? res.data : x))
      } else {
        res = await api.post('/programmes', body)
        setList(prev => [...prev, res.data])
      }
      setModal(null)
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message)
    }
    setSaving(false)
  }

  return (
    <div>
      <div className="page-heading">
        <h2>Programmes</h2>
        <p>Define academic programmes and their student strength and batch configuration.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select className="form-control" style={{ width: 240 }} value={univId} onChange={e => setUnivId(e.target.value)}>
          {univs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Programme</button>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">🎓</div>
          <div className="es-title">No programmes yet</div>
          <div className="es-sub">Add a programme to get started.</div>
        </div>
      ) : (
        <div className="item-list">
          {list.map(p => (
            <div key={p.id} className="item-row">
              <div className="item-info">
                <div className="item-name">{p.name}</div>
                <div className="item-meta">Semester {p.semester} · {p.strength} students · {p.batches} practical batch(es)</div>
              </div>
              <div className="item-actions">
                <button className="btn btn-secondary btn-xs" onClick={() => openEdit(p)}>Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? 'Add Programme' : 'Edit Programme'}</div>
            <div className="form-group">
              <label>Programme Name</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. M.Sc. DFIS" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Semester</label>
                <input type="number" className="form-control" value={form.semester} min={1} max={10}
                  onChange={e => setForm(f => ({ ...f, semester: parseInt(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label>Student Strength</label>
                <input type="number" className="form-control" value={form.strength} min={1}
                  onChange={e => setForm(f => ({ ...f, strength: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Practical Batches</label>
              <input type="number" className="form-control" value={form.batches} min={1} max={10}
                onChange={e => setForm(f => ({ ...f, batches: parseInt(e.target.value) }))} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Class split into N batches for lab sessions.</div>
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
