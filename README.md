# Academic Timetable Generator

Automated constraint-based academic timetable scheduling system.

## Running

### Backend (port 5001)
```
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend (port 3001)
```
cd frontend
npm install
npm run dev
```

Open http://localhost:3001

## Hard Constraints

1. Sessions within working hours, outside breaks
2. Faculty only during available days
3. No double-booking: faculty, room, or student group
4. Whole-class sessions cannot overlap practicals for same programme
5. Room capacity >= class/batch strength
6. Practicals in labs with consecutive periods
7. Every subject gets required weekly sessions
8. Fixed sessions stay in assigned slots
