"""
app.py – Flask REST API for the Automated Academic Timetable Generator.

Endpoints
---------
GET  /api/health
GET  /api/universities                      list all universities
POST /api/universities                      create university config
PUT  /api/universities/<uid>                update university
GET  /api/programmes                        list programmes (filter ?university_id=)
POST /api/programmes                        create programme
PUT  /api/programmes/<pid>                  update programme
GET  /api/subjects                          list subjects (filter ?programme_id=)
POST /api/subjects                          create subject
PUT  /api/subjects/<sid>                    update subject
DELETE /api/subjects/<sid>                  delete subject
GET  /api/faculty                           list faculty (filter ?university_id=)
POST /api/faculty                           create faculty
PUT  /api/faculty/<fid>                     update faculty
DELETE /api/faculty/<fid>                   delete faculty
GET  /api/rooms                             list rooms (filter ?university_id=)
POST /api/rooms                             create room
PUT  /api/rooms/<rid>                       update room
DELETE /api/rooms/<rid>                     delete room
POST /api/timetables/generate               run scheduler, return result
GET  /api/timetables                        list saved timetables
GET  /api/timetables/<tid>                  fetch a saved timetable
PUT  /api/timetables/<tid>/publish          mark timetable as published
PUT  /api/timetables/<tid>/sessions/<idx>   manually adjust a session
"""

from __future__ import annotations

import os
import traceback
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from models import (
    universities, programmes, subjects, faculty, rooms, timetables,
    new_id, seed_demo,
)
from scheduler import generate

HERE       = Path(__file__).parent
STATIC_DIR = HERE / "static"

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
CORS(app)

seed_demo()


# ── Health ─────────────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "message": "Timetable API running"})


# ── Universities ───────────────────────────────────────────────────────────────

@app.route("/api/universities", methods=["GET"])
def list_universities():
    return jsonify(list(universities.values()))


@app.route("/api/universities", methods=["POST"])
def create_university():
    body = request.get_json(force=True) or {}
    uid = body.get("id") or new_id("univ_")
    body["id"] = uid
    universities[uid] = body
    return jsonify(body), 201


@app.route("/api/universities/<uid>", methods=["PUT"])
def update_university(uid: str):
    if uid not in universities:
        return jsonify({"error": "Not found"}), 404
    body = request.get_json(force=True) or {}
    body["id"] = uid
    universities[uid] = body
    return jsonify(body)


# ── Programmes ─────────────────────────────────────────────────────────────────

@app.route("/api/programmes", methods=["GET"])
def list_programmes():
    univ_id = request.args.get("university_id")
    result = [p for p in programmes.values()
              if not univ_id or p.get("university_id") == univ_id]
    return jsonify(result)


@app.route("/api/programmes", methods=["POST"])
def create_programme():
    body = request.get_json(force=True) or {}
    pid = body.get("id") or new_id("prog_")
    body["id"] = pid
    programmes[pid] = body
    return jsonify(body), 201


@app.route("/api/programmes/<pid>", methods=["PUT"])
def update_programme(pid: str):
    if pid not in programmes:
        return jsonify({"error": "Not found"}), 404
    body = request.get_json(force=True) or {}
    body["id"] = pid
    programmes[pid] = body
    return jsonify(body)


# ── Subjects ───────────────────────────────────────────────────────────────────

@app.route("/api/subjects", methods=["GET"])
def list_subjects():
    prog_id = request.args.get("programme_id")
    result = [s for s in subjects.values()
              if not prog_id or s.get("programme_id") == prog_id]
    return jsonify(result)


@app.route("/api/subjects", methods=["POST"])
def create_subject():
    body = request.get_json(force=True) or {}
    sid = body.get("id") or new_id("subj_")
    body["id"] = sid
    subjects[sid] = body
    return jsonify(body), 201


@app.route("/api/subjects/<sid>", methods=["PUT"])
def update_subject(sid: str):
    if sid not in subjects:
        return jsonify({"error": "Not found"}), 404
    body = request.get_json(force=True) or {}
    body["id"] = sid
    subjects[sid] = body
    return jsonify(body)


@app.route("/api/subjects/<sid>", methods=["DELETE"])
def delete_subject(sid: str):
    subjects.pop(sid, None)
    return jsonify({"ok": True})


# ── Faculty ────────────────────────────────────────────────────────────────────

@app.route("/api/faculty", methods=["GET"])
def list_faculty():
    univ_id = request.args.get("university_id")
    result = [f for f in faculty.values()
              if not univ_id or f.get("university_id") == univ_id]
    return jsonify(result)


@app.route("/api/faculty", methods=["POST"])
def create_faculty():
    body = request.get_json(force=True) or {}
    fid = body.get("id") or new_id("fac_")
    body["id"] = fid
    faculty[fid] = body
    return jsonify(body), 201


@app.route("/api/faculty/<fid>", methods=["PUT"])
def update_faculty(fid: str):
    if fid not in faculty:
        return jsonify({"error": "Not found"}), 404
    body = request.get_json(force=True) or {}
    body["id"] = fid
    faculty[fid] = body
    return jsonify(body)


@app.route("/api/faculty/<fid>", methods=["DELETE"])
def delete_faculty(fid: str):
    faculty.pop(fid, None)
    return jsonify({"ok": True})


# ── Rooms ──────────────────────────────────────────────────────────────────────

@app.route("/api/rooms", methods=["GET"])
def list_rooms():
    univ_id = request.args.get("university_id")
    result = [r for r in rooms.values()
              if not univ_id or r.get("university_id") == univ_id]
    return jsonify(result)


@app.route("/api/rooms", methods=["POST"])
def create_room():
    body = request.get_json(force=True) or {}
    rid = body.get("id") or new_id("room_")
    body["id"] = rid
    rooms[rid] = body
    return jsonify(body), 201


@app.route("/api/rooms/<rid>", methods=["PUT"])
def update_room(rid: str):
    if rid not in rooms:
        return jsonify({"error": "Not found"}), 404
    body = request.get_json(force=True) or {}
    body["id"] = rid
    rooms[rid] = body
    return jsonify(body)


@app.route("/api/rooms/<rid>", methods=["DELETE"])
def delete_room(rid: str):
    rooms.pop(rid, None)
    return jsonify({"ok": True})


# ── Timetable generation ───────────────────────────────────────────────────────

@app.route("/api/timetables/generate", methods=["POST"])
def generate_timetable():
    body = request.get_json(force=True) or {}
    university_id = body.get("university_id")
    programme_ids = body.get("programme_ids")  # list or None → all
    fixed_sessions = body.get("fixed_sessions", [])

    if not university_id or university_id not in universities:
        return jsonify({"error": "university_id is required and must exist"}), 400

    univ = universities[university_id]
    progs = [p for p in programmes.values()
             if p.get("university_id") == university_id
             and (not programme_ids or p["id"] in programme_ids)]
    subjs = [s for s in subjects.values()
             if s.get("university_id") == university_id
             and (not programme_ids or s.get("programme_id") in [p["id"] for p in progs])]
    fac_map = {f["id"]: f for f in faculty.values()
               if f.get("university_id") == university_id}
    room_list = [r for r in rooms.values()
                 if r.get("university_id") == university_id]

    try:
        result = generate(univ, progs, subjs, fac_map, room_list, fixed_sessions)
    except Exception as exc:
        return jsonify({"error": str(exc), "trace": traceback.format_exc()}), 500

    tid = new_id("tt_")
    saved = {
        "id":           tid,
        "university_id": university_id,
        "programme_ids": [p["id"] for p in progs],
        "status":       result["status"],
        "published":    False,
        "sessions":     result["sessions"],
        "conflicts":    result["conflicts"],
    }
    timetables[tid] = saved
    return jsonify(saved), 201


# ── Timetables CRUD ────────────────────────────────────────────────────────────

@app.route("/api/timetables", methods=["GET"])
def list_timetables():
    return jsonify(list(timetables.values()))


@app.route("/api/timetables/<tid>", methods=["GET"])
def get_timetable(tid: str):
    tt = timetables.get(tid)
    if not tt:
        return jsonify({"error": "Not found"}), 404
    return jsonify(tt)


@app.route("/api/timetables/<tid>/publish", methods=["PUT"])
def publish_timetable(tid: str):
    tt = timetables.get(tid)
    if not tt:
        return jsonify({"error": "Not found"}), 404
    tt["published"] = True
    return jsonify(tt)


@app.route("/api/timetables/<tid>/sessions/<int:idx>", methods=["PUT"])
def update_session(tid: str, idx: int):
    """Manually adjust a session slot.  Performs conflict re-check."""
    tt = timetables.get(tid)
    if not tt:
        return jsonify({"error": "Timetable not found"}), 404
    sessions = tt["sessions"]
    if idx < 0 or idx >= len(sessions):
        return jsonify({"error": "Session index out of range"}), 400

    update = request.get_json(force=True) or {}
    # Only allow slot adjustments
    allowed = {"day", "start", "end", "room_id", "room_name"}
    for k, v in update.items():
        if k in allowed:
            sessions[idx][k] = v

    # Re-run conflict detection
    from scheduler import _has_conflict, _time_to_min
    updated_session = sessions[idx]
    updated_session["start_min"] = _time_to_min(updated_session["start"])
    updated_session["end_min"]   = _time_to_min(updated_session["end"])

    others = [
        dict(s, start_min=_time_to_min(s["start"]), end_min=_time_to_min(s["end"]))
        for i, s in enumerate(sessions) if i != idx
    ]
    conflict = _has_conflict(updated_session, others)
    updated_session.pop("start_min", None)
    updated_session.pop("end_min", None)

    return jsonify({"session": sessions[idx], "conflict": conflict})


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("TIMETABLE_PORT", 5001))
    print(f"\n  [*] Timetable API  ->  http://localhost:{port}")
    print(f"      Health check   ->  http://localhost:{port}/api/health\n")
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
