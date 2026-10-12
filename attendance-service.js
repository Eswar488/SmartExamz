"use strict";

const STATUSES = new Set(["present", "absent", "unmarked"]);

function migrateAttendanceDatabase(db) {
  const currentVersion = db.prepare("PRAGMA user_version").get().user_version;
  if (currentVersion > 3) throw new Error(`Attendance database version ${currentVersion} is newer than this application supports.`);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS students (
      roll TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      section TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS examinations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      course TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      session TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      number TEXT NOT NULL,
      building TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS room_assignments (
      exam_id TEXT NOT NULL REFERENCES examinations(id),
      room_id TEXT NOT NULL REFERENCES rooms(id),
      invigilator_id TEXT NOT NULL,
      PRIMARY KEY (exam_id, room_id)
    );
    CREATE TABLE IF NOT EXISTS allocations (
      exam_id TEXT NOT NULL REFERENCES examinations(id),
      room_id TEXT NOT NULL REFERENCES rooms(id),
      student_roll TEXT NOT NULL REFERENCES students(roll),
      seat_number INTEGER NOT NULL CHECK (seat_number > 0),
      PRIMARY KEY (exam_id, room_id, student_roll),
      UNIQUE (exam_id, student_roll),
      FOREIGN KEY (exam_id, room_id) REFERENCES room_assignments(exam_id, room_id)
    );
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      exam_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      submitted_at TEXT,
      submitted_by TEXT,
      PRIMARY KEY (exam_id, room_id),
      FOREIGN KEY (exam_id, room_id) REFERENCES room_assignments(exam_id, room_id)
    );
    CREATE TABLE IF NOT EXISTS attendance_records (
      exam_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      student_roll TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'unmarked')),
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      PRIMARY KEY (exam_id, room_id, student_roll),
      FOREIGN KEY (exam_id, room_id, student_roll)
        REFERENCES allocations(exam_id, room_id, student_roll)
    );
    CREATE TABLE IF NOT EXISTS attendance_audit (
      id INTEGER PRIMARY KEY,
      exam_id TEXT NOT NULL,
      room_id TEXT NOT NULL,
      student_roll TEXT,
      event_type TEXT NOT NULL CHECK (event_type IN ('status_changed', 'submitted')),
      old_status TEXT,
      new_status TEXT,
      actor_id TEXT NOT NULL,
      occurred_at TEXT NOT NULL
    );
  `);
  if (currentVersion < 1) db.exec("PRAGMA user_version = 1");
  if (currentVersion < 2) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(`
        ALTER TABLE examinations ADD COLUMN department TEXT NOT NULL DEFAULT '';
        ALTER TABLE examinations ADD COLUMN year INTEGER NOT NULL DEFAULT 1 CHECK (year > 0);
        ALTER TABLE examinations ADD COLUMN section TEXT NOT NULL DEFAULT '';
        ALTER TABLE examinations ADD COLUMN allocation_status TEXT NOT NULL DEFAULT 'draft'
          CHECK (allocation_status IN ('draft', 'published'));
        ALTER TABLE examinations ADD COLUMN published_at TEXT;
        ALTER TABLE examinations ADD COLUMN published_by TEXT;
        ALTER TABLE rooms ADD COLUMN capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0);
        ALTER TABLE rooms ADD COLUMN available INTEGER NOT NULL DEFAULT 1 CHECK (available IN (0, 1));
        ALTER TABLE students ADD COLUMN year INTEGER NOT NULL DEFAULT 1 CHECK (year > 0);
        UPDATE rooms SET capacity = MAX(1, COALESCE((
          SELECT COUNT(*) FROM allocations WHERE room_id = rooms.id
          GROUP BY exam_id ORDER BY COUNT(*) DESC LIMIT 1
        ), 0));
        CREATE TABLE exam_eligibility (
          exam_id TEXT NOT NULL REFERENCES examinations(id) ON DELETE CASCADE,
          student_roll TEXT NOT NULL REFERENCES students(roll),
          PRIMARY KEY (exam_id, student_roll)
        );
        CREATE UNIQUE INDEX allocations_unique_seat
          ON allocations (exam_id, room_id, seat_number);
        CREATE TRIGGER allocations_capacity_insert
        BEFORE INSERT ON allocations
        BEGIN
          SELECT CASE WHEN (
            SELECT COUNT(*) FROM allocations WHERE exam_id = NEW.exam_id AND room_id = NEW.room_id
          ) >= (SELECT capacity FROM rooms WHERE id = NEW.room_id)
          THEN RAISE(ABORT, 'room capacity exceeded') END;
        END;
        CREATE TRIGGER allocations_capacity_update
        BEFORE UPDATE OF exam_id, room_id ON allocations
        BEGIN
          SELECT CASE WHEN (
            SELECT COUNT(*) FROM allocations
            WHERE exam_id = NEW.exam_id AND room_id = NEW.room_id
              AND NOT (exam_id = OLD.exam_id AND room_id = OLD.room_id AND student_roll = OLD.student_roll)
          ) >= (SELECT capacity FROM rooms WHERE id = NEW.room_id)
          THEN RAISE(ABORT, 'room capacity exceeded') END;
        END;
        CREATE TRIGGER rooms_capacity_update
        BEFORE UPDATE OF capacity ON rooms
        BEGIN
          SELECT CASE WHEN EXISTS (
            SELECT 1 FROM allocations WHERE room_id = OLD.id
            GROUP BY exam_id HAVING COUNT(*) > NEW.capacity
          )
          THEN RAISE(ABORT, 'room capacity below allocated seats') END;
        END;
        CREATE TABLE allocation_audit (
          id INTEGER PRIMARY KEY,
          exam_id TEXT NOT NULL REFERENCES examinations(id),
          event_type TEXT NOT NULL CHECK (event_type IN ('draft_generated', 'draft_saved', 'published')),
          actor_id TEXT NOT NULL,
          occurred_at TEXT NOT NULL,
          details TEXT NOT NULL
        );
        PRAGMA user_version = 2;
      `);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  if (currentVersion < 3) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec(`
        ALTER TABLE students ADD COLUMN email TEXT;
        CREATE UNIQUE INDEX students_unique_email
          ON students (lower(email)) WHERE email IS NOT NULL;
        CREATE TABLE student_accounts (
          student_roll TEXT PRIMARY KEY REFERENCES students(roll) ON DELETE CASCADE,
          password_salt TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE audit_events (
          id INTEGER PRIMARY KEY,
          actor_id TEXT NOT NULL,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          details TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX audit_events_created_at ON audit_events (created_at);
        PRAGMA user_version = 3;
      `);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

function createAttendanceService(db) {
  const allocationExists = db.prepare(`
    SELECT ra.invigilator_id, a.seat_number, s.roll, s.name, s.department, s.section,
           e.id AS exam_id, e.name AS exam_name, e.code, e.course, e.exam_date, e.session,
           r.id AS room_id, r.number AS room_number, r.building
    FROM allocations a
    JOIN room_assignments ra ON ra.exam_id = a.exam_id AND ra.room_id = a.room_id
    JOIN students s ON s.roll = a.student_roll
    JOIN examinations e ON e.id = a.exam_id
    JOIN rooms r ON r.id = a.room_id
    WHERE a.exam_id = ? AND a.room_id = ? AND a.student_roll = ?
  `);
  const requireActorAssignment = (examId, roomId, actorId) => {
    const assignment = db.prepare(`
      SELECT 1 FROM room_assignments
      WHERE exam_id = ? AND room_id = ? AND invigilator_id = ? LIMIT 1
    `).get(examId, roomId, actorId);
    if (!assignment) throw Object.assign(new Error("You are not assigned to this examination room."), { status: 403 });
  };
  const ensureSession = db.prepare(`
    INSERT OR IGNORE INTO attendance_sessions (exam_id, room_id) VALUES (?, ?)
  `);

  function getAttendance(examId, roomId, actorId) {
    requireActorAssignment(examId, roomId, actorId);
    ensureSession.run(examId, roomId);
    const exam = db.prepare(`
      SELECT e.id AS exam_id, e.name AS exam_name, e.code, e.course, e.exam_date, e.session,
             r.id AS room_id, r.number AS room_number, r.building,
             ss.submitted_at, ss.submitted_by
      FROM examinations e JOIN rooms r ON 1=1
      JOIN attendance_sessions ss ON ss.exam_id = e.id AND ss.room_id = r.id
      WHERE e.id = ? AND r.id = ?
    `).get(examId, roomId);
    if (!exam) throw Object.assign(new Error("Examination room does not exist."), { status: 404 });
    const students = db.prepare(`
      SELECT s.roll, s.name, s.department, s.section, a.seat_number,
             COALESCE(ar.status, 'unmarked') AS status
      FROM allocations a
      JOIN students s ON s.roll = a.student_roll
      LEFT JOIN attendance_records ar
        ON ar.exam_id = a.exam_id AND ar.room_id = a.room_id AND ar.student_roll = a.student_roll
      WHERE a.exam_id = ? AND a.room_id = ?
      ORDER BY a.seat_number, s.roll
    `).all(examId, roomId);
    const counts = { present: 0, absent: 0, unmarked: 0 };
    students.forEach((student) => { counts[student.status] += 1; });
    const audit = db.prepare(`
      SELECT student_roll AS studentRoll, event_type AS eventType,
             old_status AS oldStatus, new_status AS newStatus,
             actor_id AS actorId, occurred_at AS occurredAt
      FROM attendance_audit
      WHERE exam_id = ? AND room_id = ?
      ORDER BY id DESC LIMIT 30
    `).all(examId, roomId);
    return { exam, students, counts, total: students.length, audit };
  }

  function changeAttendance({ examId, roomId, studentRoll, status, actorId }) {
    if (!STATUSES.has(status)) throw Object.assign(new Error("Attendance status must be present, absent, or unmarked."), { status: 422 });
    const allocation = allocationExists.get(examId, roomId, studentRoll);
    if (!allocation) throw Object.assign(new Error("Student is not allocated to this examination room."), { status: 404 });
    requireActorAssignment(examId, roomId, actorId);
    ensureSession.run(examId, roomId);
    const session = db.prepare(`
      SELECT submitted_at FROM attendance_sessions WHERE exam_id = ? AND room_id = ?
    `).get(examId, roomId);
    if (session.submitted_at) throw Object.assign(new Error("Submitted attendance cannot be changed."), { status: 409 });
    const current = db.prepare(`
      SELECT status FROM attendance_records
      WHERE exam_id = ? AND room_id = ? AND student_roll = ?
    `).get(examId, roomId, studentRoll);
    const oldStatus = current?.status || "unmarked";
    if (oldStatus !== status) {
      const now = new Date().toISOString();
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(`
          INSERT INTO attendance_records (exam_id, room_id, student_roll, status, updated_at, updated_by)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (exam_id, room_id, student_roll)
          DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, updated_by = excluded.updated_by
        `).run(examId, roomId, studentRoll, status, now, actorId);
        db.prepare(`
          INSERT INTO attendance_audit
            (exam_id, room_id, student_roll, event_type, old_status, new_status, actor_id, occurred_at)
          VALUES (?, ?, ?, 'status_changed', ?, ?, ?, ?)
        `).run(examId, roomId, studentRoll, oldStatus, status, actorId, now);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    return getAttendance(examId, roomId, actorId);
  }

  function submitAttendance({ examId, roomId, actorId }) {
    requireActorAssignment(examId, roomId, actorId);
    ensureSession.run(examId, roomId);
    db.exec("BEGIN IMMEDIATE");
    try {
    const session = db.prepare(`
      SELECT submitted_at, submitted_by FROM attendance_sessions WHERE exam_id = ? AND room_id = ?
    `).get(examId, roomId);
    if (session.submitted_at) throw Object.assign(new Error("Attendance has already been submitted."), { status: 409 });
    const counts = db.prepare(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(ar.status, 'unmarked') = 'present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN COALESCE(ar.status, 'unmarked') = 'absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN COALESCE(ar.status, 'unmarked') = 'unmarked' THEN 1 ELSE 0 END) AS unmarked
      FROM allocations a
      LEFT JOIN attendance_records ar
        ON ar.exam_id = a.exam_id AND ar.room_id = a.room_id AND ar.student_roll = a.student_roll
      WHERE a.exam_id = ? AND a.room_id = ?
    `).get(examId, roomId);
    if (!counts.total) throw Object.assign(new Error("This room has no allocated students."), { status: 422 });
    if (counts.unmarked) throw Object.assign(new Error(`${counts.unmarked} attendance record(s) remain unmarked.`), { status: 422 });
    const submittedAt = new Date().toISOString();
    const update = db.prepare(`
      UPDATE attendance_sessions SET submitted_at = ?, submitted_by = ?
      WHERE exam_id = ? AND room_id = ? AND submitted_at IS NULL
    `).run(submittedAt, actorId, examId, roomId);
    if (update.changes !== 1) throw Object.assign(new Error("Attendance has already been submitted."), { status: 409 });
    db.prepare(`
      INSERT INTO attendance_audit
        (exam_id, room_id, student_roll, event_type, old_status, new_status, actor_id, occurred_at)
      VALUES (?, ?, NULL, 'submitted', NULL, NULL, ?, ?)
    `).run(examId, roomId, actorId, submittedAt);
    const details = db.prepare(`
      SELECT e.name AS exam_name, e.code, e.course, e.exam_date, e.session,
             r.number AS room_number, r.building
      FROM examinations e JOIN rooms r ON 1=1
      WHERE e.id = ? AND r.id = ?
    `).get(examId, roomId);
    const receipt = {
      examId, exam: details, roomId, submittedAt, submittedBy: actorId,
      counts: { present: counts.present || 0, absent: counts.absent || 0, unmarked: counts.unmarked || 0 },
      total: counts.total
    };
    db.exec("COMMIT");
    return receipt;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  return { getAttendance, changeAttendance, submitAttendance };
}

module.exports = { migrateAttendanceDatabase, createAttendanceService };
