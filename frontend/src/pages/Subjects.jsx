import { useEffect, useState } from 'react'
import api from '../api.js'

const EMPTY = {
  code: '', name: '',
  theory_periods_per_week: 3,
  practical_sessions_per_batch: 0,
  practical_consecutive_periods: 2,
  faculty_id: '',
}

export default function Subjects() {
  const [univs,    setUnivs]    = useState([])
  const [univId,   setUnivId]   = useState('')
  const [progs,    setProgs]    = useState([])
  const [progId,   setProgId]   = useState('')
  const [facList,  setFacList]  = useState([])
  const [list,     setList]     = useState([])
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [editId,   setEditId]   = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null)

  useEffect(() => {
    api.get('/universities').then(r => {
      setUnivs(r.data)
      if (r.data.length) setUnivId(r.data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!univId) return
    Promise.all([
      api.get(`/programmes?university_id=${univId}`),
      api.get(`/faculty?university_id=${univId}`),
    ]).then(([p, f]) => {
      setProgs(p.data)
      setFacList(f.data)
      if (p.data.length) setProgId(p.data[0].id)
    })
  }, [univId])

  useEffect(() => {
    if (progId) api.get(`/subjects?programme_id=${progId}`).then(r => setList(r.data))
  }, [progId])

  function openAdd() { setForm({ ...EMPTY, faculty_id: facList[0]?.id || '' }); setEditId(null); setModal('add'); setMsg(null) }
  function openEdit(s) {
    setForm({
      code: s.code, name: s.name,
      theory_periods_per_week: s.theory_periods_per_week,
      practical_sessions_per_batch: s.practical_sessions_per_batch,
      practical_consecutive_periods: s.practical_consecutive_periods,
      faculty_id: s.faculty_id,
    })
    setEditId(s.id); setModal('edit'); setMsg(null)
  }

  async function remove(sid) {
    await api.delete(`/subjects/${sid}`)
    setList(prev => prev.filter(x => x.id !== sid))
  }

  async function save() {
    setSaving(true); setMsg(null)
    const body = { ...form, programme_id: progId, university_id: univId }
    try {
      let res
      if (editId) {
        res = await api.put(`/subjects/${editId}`, body)
        setList(prev => prev.map(x => x.id === editId ? res.data : x))
      } else {
        res = await api.post('/subjects', body)
        setList(prev => [...prev, res.data])
      }
      setModal(null)
    } catch (e) {
      setMsg(e?.response?.data?.error || e.message)
    }
    setSaving(false)
  }

  const facName = id => facList.find(f => f.id === id)?.name || id

  return (
    <div>
      <div className="page-heading">
        <h2>Subjects</h2>
        <p>Define theory and practical requirements per subject, and assign faculty.</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="form-control" style={{ width: 200 }} value={univId} onChange={e => setUnivId(e.target.value)}>
          {univs.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="form-control" style={{ width: 240 }} value={progId} onChange={e => setProgId(e.target.value)}>
          {progs.map(p => <option key={p.id} value={p.id}>{p.name} — Sem {p.semester}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Subject</button>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon">📚</div>
          <div className="es-title">No subjects yet</div>
          <div className="es-sub">Add subjects for this programme.</div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Subject</th><th>Theory / wk</th><th>Practical / batch</th><th>Consec. Periods</th><th>Faculty</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.code}</strong></td>
                  <td>{s.name}</td>
                  <td><span className="badge badge-theory">{s.theory_periods_per_week}p</span></td>
                  <td>{s.practical_sessions_per_batch > 0 ? <span className="badge badge-practical">{s.practical_sessions_per_batch} session(s)</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td>{s.practical_sessions_per_batch > 0 ? s.practical_consecutive_periods : '—'}</td>
                  <td>{facName(s.faculty_id)}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-xs" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-danger btn-xs" onClick={() => remove(s.id)}>Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{modal === 'add' ? 'Add Subject' : 'Edit Subject'}</div>
            <div className="form-row">
              <div className="form-group">
                <label>Subject Code</label>
                <input className="form-control" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="DFIS101" />
              </div>
              <div className="form-group">
                <label>Subject Name</label>
                <input className="form-control" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Digital Forensics" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Theory Periods / Week</label>
                <input type="number" className="form-control" value={form.theory_periods_per_week} min={0}
                  onChange={e => setForm(f => ({ ...f, theory_periods_per_week: parseInt(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label>Practical Sessions / Batch / Week</label>
                <input type="number" className="form-control" value={form.practical_sessions_per_batch} min={0}
                  onChange={e => setForm(f => ({ ...f, practical_sessions_per_batch: parseInt(e.target.value) }))} />
              </div>
            </div>
            {form.practical_sessions_per_batch > 0 && (
              <div className="form-group">
                <label>Consecutive Periods per Practical</label>
                <input type="number" className="form-control" value={form.practical_consecutive_periods} min={1} max={4}
                  onChange={e => setForm(f => ({ ...f, practical_consecutive_periods: parseInt(e.target.value) }))} />
              </div>
            )}
            <div className="form-group">
              <label>Assigned Faculty</label>
              <select className="form-control" value={form.faculty_id} onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value }))}>
                <option value="">— select —</option>
                {facList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
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
