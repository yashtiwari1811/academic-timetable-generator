import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import UniversitySetup from './pages/UniversitySetup.jsx'
import Programmes from './pages/Programmes.jsx'
import Subjects from './pages/Subjects.jsx'
import Faculty from './pages/Faculty.jsx'
import Rooms from './pages/Rooms.jsx'
import Generate from './pages/Generate.jsx'
import TimetableView from './pages/TimetableView.jsx'

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>📅 Timetable Generator</h1>
        <span>Automated Academic Scheduler</span>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section">Overview</div>
        <NavLink to="/" end className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">⊞</span> Dashboard
        </NavLink>

        <div className="sidebar-section">Setup</div>
        <NavLink to="/university" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">🏛</span> University
        </NavLink>
        <NavLink to="/programmes" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">🎓</span> Programmes
        </NavLink>
        <NavLink to="/subjects" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">📚</span> Subjects
        </NavLink>
        <NavLink to="/faculty" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">👩‍🏫</span> Faculty
        </NavLink>
        <NavLink to="/rooms" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">🚪</span> Rooms & Labs
        </NavLink>

        <div className="sidebar-section">Scheduling</div>
        <NavLink to="/generate" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">⚡</span> Generate
        </NavLink>
        <NavLink to="/timetables" className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
          <span className="icon">🗂</span> Timetables
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        Academic Timetable System<br />
        Constraint-Based Scheduler
      </div>
    </aside>
  )
}

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/university" element={<UniversitySetup />} />
          <Route path="/programmes" element={<Programmes />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/faculty" element={<Faculty />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/timetables" element={<TimetableView />} />
          <Route path="/timetables/:tid" element={<TimetableView />} />
        </Routes>
      </main>
    </div>
  )
}
