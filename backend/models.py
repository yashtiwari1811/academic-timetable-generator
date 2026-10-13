"""
models.py – In-memory data models for the timetable system.
All data is stored in-process (dict-based) for the hackathon demo.
"""
from __future__ import annotations
import uuid
from dataclasses import dataclass, field
from typing import Any

# ── In-memory stores ──────────────────────────────────────────────────────────
universities: dict[str, dict] = {}   # university_id -> config
programmes:   dict[str, dict] = {}   # programme_id  -> config
subjects:     dict[str, dict] = {}   # subject_id    -> config
faculty:      dict[str, dict] = {}   # faculty_id    -> config
rooms:        dict[str, dict] = {}   # room_id       -> config
timetables:   dict[str, dict] = {}   # timetable_id  -> generated result


def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}"


# ── Seed demo data ────────────────────────────────────────────────────────────

def seed_demo():
    """Populate a small demo dataset so the UI has something to show."""
    if universities:
        return

    uid = "univ_demo"
    universities[uid] = {
        "id": uid,
        "name": "Demo University",
        "working_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "start_time": "09:00",
        "end_time": "17:00",
        "period_duration": 60,   # minutes
        "breaks": [
            {"label": "Lunch", "start": "13:00", "end": "14:00"}
        ],
    }

    # Rooms
    for i, (name, cap, kind) in enumerate([
        ("Room A101", 60, "classroom"),
        ("Room A102", 60, "classroom"),
        ("Lab B201",  30, "lab"),
        ("Lab B202",  30, "lab"),
    ]):
        rid = f"room_{i+1:03d}"
        rooms[rid] = {"id": rid, "name": name, "capacity": cap, "type": kind, "university_id": uid}

    # Faculty
    faculty_data = [
        ("Dr. Alice",  ["MON:09-17", "WED:09-17", "FRI:09-17"]),
        ("Dr. Bob",    ["TUE:09-17", "THU:09-17"]),
        ("Dr. Carol",  ["MON:09-17", "TUE:09-17", "WED:09-17"]),
        ("Dr. Dave",   ["WED:09-17", "THU:09-17", "FRI:09-17"]),
    ]
    fids = []
    for i, (name, avail) in enumerate(faculty_data):
        fid = f"fac_{i+1:03d}"
        faculty[fid] = {"id": fid, "name": name, "university_id": uid,
                        "availability": avail, "subjects": []}
        fids.append(fid)

    # Programme + subjects
    pid = "prog_msc_dfis"
    programmes[pid] = {
        "id": pid, "name": "M.Sc. DFIS", "semester": 1,
        "strength": 40, "batches": 2, "university_id": uid,
    }

    subj_data = [
        ("DFIS101", "Digital Forensics",     3, 0, fids[0]),
        ("DFIS102", "Cyber Law",             2, 0, fids[1]),
        ("DFIS103", "Network Security",      3, 1, fids[2]),
        ("DFIS104", "Malware Analysis",      2, 1, fids[3]),
    ]
    for code, name, theory, prac, fid in subj_data:
        sid = f"subj_{code.lower()}"
        subjects[sid] = {
            "id": sid, "code": code, "name": name,
            "programme_id": pid, "university_id": uid,
            "theory_periods_per_week": theory,
            "practical_sessions_per_batch": prac,
            "practical_consecutive_periods": 2 if prac else 0,
            "faculty_id": fid,
        }
        faculty[fid]["subjects"].append(sid)
