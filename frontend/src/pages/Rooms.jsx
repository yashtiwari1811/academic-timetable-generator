import { useEffect, useState } from 'react'
import api from '../api.js'

const EMPTY = { name: '', capacity: 30, type: 'classroom' }

export default function Rooms() {
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
    if (univId) api.get(`/rooms?university_id=${univId}`).then(r => setList(r.data))
  }, [univId])

  function openAdd() { setForm(EMPTY); setEditId(null); setModal('add'); setMsg(null) }
  function openEdit(r) { setForm({ name: r.name, capacity: r.capacity, type: r.type }); setEditId(r.id); setModal('edit'); setMsg(null) }

  async function remove(rid) {
    await api.delete(`/rooms/${rid}`)
    setList(prev => prev.filter(x => x.id !== rid))
  }

  async function save() {
    setSaving(true); setMsg(null)
    const body = { ...form, university_id: univId }
    try {
      let res
      if (editId) {
        res = await api.put(`/rooms/${editId}`, body)
        setList(prev => prev.map(x => x.id === editId ? res.data : x))
      } else {
        res = await api.post('/rooms', body)
        setList(prev => [...prev, res.data])
      }
      setModal(null)
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message)
    }
    setSaving(false)
  }

  const classrooms = list.filter(r => r.type === 'classroom')
  const labs       = list.filter(r => r.type === 'lab')

  return (
    <div>
      <div className="page-heading">
        <h2>Rooms &amp; Labs</h2>
        <p>Manage classrooms and laboratories, with their capacity information.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <select className="form-control" style={{ width: 240 }} value={univId} onChange={e => setUnivId(e.target.value)}>
          {univs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Room / Lab</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Classrooms */}
        <div className="card">
          <div className="card-title">Classrooms ({classrooms.length})</div>
          {classrooms.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No classrooms added.</p>
          ) : (
            <div className="item-list">
              {classrooms.map(r => (
                <div key={r.id} className="item-row">
                  <div className="item-info">
                    <div className="item-name">{r.name}</div>
                    <div className="item-meta">Capacity: {r.capacity}</div>
                  </div>
                  <div className="item-actions">
                    <button className="btn btn-secondary btn-xs" onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => remove(r.id)}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Labs */}
        <div className="card">
          <div className="card-title">Laboratories ({labs.length})</div>
          {labs.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>No labs added.</p>
          ) : (
            <div className="item-list">
              {labs.map(r => (
                <div key={r.id} className="item-row">
                  <div className="item-info">
                    <div className="item-name">{r.name}</div>
                    <div className="item-meta">Capacity: {r.capacity}</div>
                  </div>
                  <div className="item-actions">
                    <button className="btn btn-secondary btn-xs" onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => remove(r.id)}>Del</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? 'Add Room / Lab' : 'Edit Room / Lab'}</div>
            <div className="form-group">
              <label>Name</label>
              <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Room A101" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Capacity</label>
                <input type="number" className="form-control" value={form.capacity} min={1}
                  onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="classroom">Classroom</option>
                  <option value="lab">Laboratory</option>
                </select>
              </div>
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
