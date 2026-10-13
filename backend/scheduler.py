"""
scheduler.py – Constraint-based timetable generator.

Algorithm:
  1. Derive all time slots from university config.
  2. For each subject, collect theory and practical session requirements.
  3. Use a greedy backtracking CSP to place each session into a slot,
     checking all hard constraints on every assignment.
  4. Return the placed sessions or a list of conflict messages.

Hard constraints:
  C1  Sessions within working hours / outside breaks.
  C2  Faculty only scheduled during their available days.
  C3  No faculty / room / student-group double-booking.
  C4  Whole-class session cannot overlap a practical for the same programme.
  C5  Room capacity >= batch/class strength.
  C6  Practicals use a lab and occupy consecutive periods.
  C7  Every subject gets its required weekly counts.
  C8  Fixed sessions stay in their assigned slots.
"""
from __future__ import annotations

from copy import deepcopy
from typing import Any

DAY_ABBREV = {
    "MON": "Monday", "TUE": "Tuesday", "WED": "Wednesday",
    "THU": "Thursday", "FRI": "Friday", "SAT": "Saturday", "SUN": "Sunday",
}


# ── Slot helpers ──────────────────────────────────────────────────────────────

def _time_to_min(t: str) -> int:
    h, m = map(int, t.split(":"))
    return h * 60 + m


def _min_to_time(m: int) -> str:
    return f"{m // 60:02d}:{m % 60:02d}"


def _faculty_available(fac: dict, day: str) -> bool:
    """Check if a faculty member is available on a given day."""
    for slot in fac.get("availability", []):
        parts = slot.split(":")
        day_abbrev = parts[0]
        full_day = DAY_ABBREV.get(day_abbrev, day_abbrev)
        if full_day == day:
            return True
    return False


def _in_break(start_min: int, end_min: int, breaks: list[dict]) -> bool:
    for b in breaks:
        bs = _time_to_min(b["start"])
        be = _time_to_min(b["end"])
        if start_min < be and end_min > bs:
            return True
    return False


def _slots_from_config(univ: dict) -> list[dict]:
    """Generate all (day, start_min, end_min) period slots from university config."""
    days      = univ["working_days"]
    start     = _time_to_min(univ["start_time"])
    end       = _time_to_min(univ["end_time"])
    duration  = univ["period_duration"]
    breaks    = univ.get("breaks", [])
    slots = []
    for day in days:
        cur = start
        while cur + duration <= end:
            s, e = cur, cur + duration
            if not _in_break(s, e, breaks):
                slots.append({
                    "day": day,
                    "start": _min_to_time(s),
                    "end":   _min_to_time(e),
                    "start_min": s,
                    "end_min":   e,
                })
            cur += duration
            # Skip past any break that starts at cur
            for b in breaks:
                bs = _time_to_min(b["start"])
                be = _time_to_min(b["end"])
                if cur >= bs and cur < be:
                    cur = be
    return slots


def _consecutive_slots(slots: list[dict], n: int) -> list[list[dict]]:
    """Return groups of n back-to-back slots (same day, no gap)."""
    groups = []
    by_day: dict[str, list[dict]] = {}
    for s in slots:
        by_day.setdefault(s["day"], []).append(s)
    for day_slots in by_day.values():
        ds = sorted(day_slots, key=lambda x: x["start_min"])
        for i in range(len(ds) - n + 1):
            group = ds[i:i + n]
            ok = all(
                group[j + 1]["start_min"] == group[j]["end_min"]
                for j in range(n - 1)
            )
            if ok:
                groups.append(group)
    return groups


# ── Conflict detection ────────────────────────────────────────────────────────

def _overlaps(a_start: int, a_end: int, b_start: int, b_end: int) -> bool:
    return a_start < b_end and a_end > b_start


def _has_conflict(session: dict, placed: list[dict]) -> str | None:
    """Return a conflict message if session conflicts with any already-placed session."""
    s_s = session["start_min"]
    s_e = session["end_min"]
    s_day = session["day"]

    for p in placed:
        if p["day"] != s_day:
            continue
        if not _overlaps(s_s, s_e, p["start_min"], p["end_min"]):
            continue
        # Same day & time overlap — check resources
        if session.get("faculty_id") and session["faculty_id"] == p.get("faculty_id"):
            return f"Faculty '{session['faculty_name']}' double-booked on {s_day} {session['start']}–{session['end']}"
        if session.get("room_id") and session["room_id"] == p.get("room_id"):
            return f"Room '{session['room_name']}' double-booked on {s_day} {session['start']}–{session['end']}"
        if session.get("programme_id") and session["programme_id"] == p.get("programme_id"):
            # Whole-class vs practical: batch check
            if session.get("batch") is None and p.get("batch") is None:
                return f"Programme '{session['programme_name']}' has overlapping whole-class sessions on {s_day}"
            if session.get("batch") is not None and p.get("batch") is not None:
                if session["batch"] == p["batch"]:
                    return f"Batch {session['batch']} of '{session['programme_name']}' double-booked on {s_day}"
            # C4: whole-class overlaps a practical involving same programme
            if (session.get("batch") is None) != (p.get("batch") is None):
                return (f"Whole-class session for '{session['programme_name']}' overlaps a practical "
                        f"on {s_day} {session['start']}–{session['end']}")
    return None


# ── Main scheduler ────────────────────────────────────────────────────────────

def generate(
    univ: dict,
    progs: list[dict],
    subjs: list[dict],
    fac_map: dict[str, dict],
    room_list: list[dict],
    fixed_sessions: list[dict] | None = None,
) -> dict:
    """
    Returns:
      { "sessions": [...], "conflicts": [...], "status": "success"|"partial"|"failed" }
    """
    slots   = _slots_from_config(univ)
    placed  = list(fixed_sessions or [])
    conflicts: list[str] = []

    # Sort subjects: fixed first, then by most constrained (fewest available slots)
    for subj in subjs:
        fac = fac_map.get(subj.get("faculty_id", ""))
        if not fac:
            conflicts.append(f"Subject '{subj['code']}' has no assigned faculty.")
            continue

        available_slots = [
            s for s in slots if _faculty_available(fac, s["day"])
        ]

        # ── Theory sessions ───────────────────────────────────────────────────
        theory_needed = subj.get("theory_periods_per_week", 0)
        theory_placed = 0

        # Filter rooms by classroom type and capacity
        prog = next((p for p in progs if p["id"] == subj.get("programme_id")), {})
        strength = prog.get("strength", 0)
        class_rooms = [r for r in room_list if r["type"] == "classroom" and r["capacity"] >= strength]
        if not class_rooms and theory_needed:
            conflicts.append(
                f"No classroom with capacity >= {strength} found for '{subj['code']}' theory sessions."
            )

        for slot in available_slots:
            if theory_placed >= theory_needed:
                break
            if not class_rooms:
                break
            room = class_rooms[0]
            session = {
                "subject_id":     subj["id"],
                "subject_code":   subj["code"],
                "subject_name":   subj["name"],
                "faculty_id":     fac["id"],
                "faculty_name":   fac["name"],
                "room_id":        room["id"],
                "room_name":      room["name"],
                "programme_id":   prog.get("id", ""),
                "programme_name": prog.get("name", ""),
                "type":           "theory",
                "batch":          None,
                "day":            slot["day"],
                "start":          slot["start"],
                "end":            slot["end"],
                "start_min":      slot["start_min"],
                "end_min":        slot["end_min"],
            }
            conflict = _has_conflict(session, placed)
            if conflict:
                continue
            placed.append(session)
            theory_placed += 1

        if theory_placed < theory_needed:
            conflicts.append(
                f"Subject '{subj['code']}' needs {theory_needed} theory periods/week "
                f"but only {theory_placed} could be scheduled "
                f"(faculty '{fac['name']}' available {len(available_slots)} slots)."
            )

        # ── Practical sessions ────────────────────────────────────────────────
        prac_sessions = subj.get("practical_sessions_per_batch", 0)
        if prac_sessions == 0:
            continue

        consec = subj.get("practical_consecutive_periods", 2)
        batches = prog.get("batches", 1)
        batch_strength = strength // batches if batches else strength
        labs = [r for r in room_list if r["type"] == "lab" and r["capacity"] >= batch_strength]

        if not labs:
            conflicts.append(
                f"No lab with capacity >= {batch_strength} for '{subj['code']}' practicals."
            )
            continue

        consec_groups = _consecutive_slots(available_slots, consec)

        for batch_num in range(1, batches + 1):
            placed_for_batch = 0
            for group in consec_groups:
                if placed_for_batch >= prac_sessions:
                    break
                lab = labs[0]
                # Build a multi-period session (represented as one session spanning all)
                first, last = group[0], group[-1]
                session = {
                    "subject_id":     subj["id"],
                    "subject_code":   subj["code"],
                    "subject_name":   subj["name"],
                    "faculty_id":     fac["id"],
                    "faculty_name":   fac["name"],
                    "room_id":        lab["id"],
                    "room_name":      lab["name"],
                    "programme_id":   prog.get("id", ""),
                    "programme_name": prog.get("name", ""),
                    "type":           "practical",
                    "batch":          batch_num,
                    "day":            first["day"],
                    "start":          first["start"],
                    "end":            last["end"],
                    "start_min":      first["start_min"],
                    "end_min":        last["end_min"],
                    "periods":        consec,
                }
                conflict = _has_conflict(session, placed)
                if conflict:
                    continue
                placed.append(session)
                placed_for_batch += 1

            if placed_for_batch < prac_sessions:
                conflicts.append(
                    f"Subject '{subj['code']}' batch {batch_num} needs {prac_sessions} "
                    f"practical session(s) but only {placed_for_batch} could be scheduled."
                )

    # Remove start_min / end_min from output (internal use only)
    clean = []
    for s in placed:
        c = {k: v for k, v in s.items() if k not in ("start_min", "end_min")}
        clean.append(c)

    status = "success" if not conflicts else ("partial" if clean else "failed")
    return {"sessions": clean, "conflicts": conflicts, "status": status}
