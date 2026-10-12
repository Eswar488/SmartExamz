"use strict";

const ROOM_STRATEGIES = new Set(["fewestRooms", "balanced"]);
const STUDENT_ORDERS = new Set(["rollAscending", "rollDescending"]);

function statusError(message, status) {
  return Object.assign(new Error(message), { status });
}

function createSeatingService(db, { invigilatorIds = [] } = {}) {
  const validInvigilators = new Set(invigilatorIds);
  const membershipKey = (assignments) => JSON.stringify(assignments
    .map(({ studentRoll, roomId }) => [studentRoll, roomId])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])));

  function listExams() {
    const exams = db.prepare(`
      SELECT id, name, code, course, exam_date AS date, session, department, year, section,
             allocation_status AS allocationStatus, published_at AS publishedAt
      FROM examinations ORDER BY exam_date, session, code, id
    `).all();
    return {
      exams: exams.map((exam) => ({
        ...exam,
        eligible: db.prepare("SELECT student_roll AS roll FROM exam_eligibility WHERE exam_id = ? ORDER BY student_roll")
          .all(exam.id).map((row) => row.roll)
      })),
      rooms: db.prepare("SELECT id, number, building, capacity, available FROM rooms ORDER BY number, id").all(),
      invigilators: [...validInvigilators].sort()
    };
  }

  function getExam(examId) {
    const exam = db.prepare(`
      SELECT id, name, code, course, exam_date AS date, session, department, year, section,
             allocation_status AS allocationStatus, published_at AS publishedAt
      FROM examinations WHERE id = ?
    `).get(examId);
    if (!exam) throw statusError("Examination not found.", 404);
    return exam;
  }

  function allocationData(examId) {
    const exam = getExam(examId);
    const students = db.prepare(`
      SELECT s.roll, s.name, s.department, s.section, s.year
      FROM exam_eligibility ee JOIN students s ON s.roll = ee.student_roll
      WHERE ee.exam_id = ? ORDER BY s.roll
    `).all(examId);
    const rooms = db.prepare(`
      SELECT r.id, r.number, r.building, r.capacity, r.available AS available,
             COALESCE(ra.invigilator_id, '') AS invigilatorId,
             CASE WHEN r.available = 1 AND NOT EXISTS (
                 SELECT 1 FROM room_assignments other_ra
                 JOIN examinations other_e ON other_e.id = other_ra.exam_id
                 WHERE other_ra.room_id = r.id AND other_ra.exam_id <> ?
                   AND other_e.exam_date = ? AND other_e.session = ?
               ) THEN 1 ELSE 0 END AS usable
      FROM rooms r
      LEFT JOIN room_assignments ra ON ra.exam_id = ? AND ra.room_id = r.id
      ORDER BY r.number, r.id
    `).all(examId, exam.date, exam.session, examId);
    const assigned = db.prepare(`
      SELECT a.student_roll AS studentRoll, a.room_id AS roomId, a.seat_number AS seatNumber,
             ra.invigilator_id AS invigilatorId
      FROM allocations a JOIN room_assignments ra
        ON ra.exam_id = a.exam_id AND ra.room_id = a.room_id
      WHERE a.exam_id = ? ORDER BY a.room_id, a.seat_number, a.student_roll
    `).all(examId);
    const clashes = db.prepare(`
      SELECT ee.student_roll AS studentRoll, e.id AS examId, e.code, e.course
      FROM exam_eligibility ee JOIN examinations e ON e.id = ee.exam_id
      WHERE ee.exam_id <> ? AND e.exam_date = ? AND e.session = ?
        AND ee.student_roll IN (SELECT student_roll FROM exam_eligibility WHERE exam_id = ?)
      ORDER BY ee.student_roll, e.code
    `).all(examId, exam.date, exam.session, examId);
    return { exam, students, rooms, assignments: assigned, studentClashes: clashes };
  }

  function propose({ examId, roomStrategy = "fewestRooms", studentOrder = "rollAscending" }) {
    if (!ROOM_STRATEGIES.has(roomStrategy) || !STUDENT_ORDERS.has(studentOrder)) {
      throw statusError("Unsupported seating rule.", 422);
    }
    const data = allocationData(examId);
    if (data.exam.allocationStatus === "published") {
      throw statusError("Published seating cannot be regenerated.", 409);
    }
    const clashesByStudent = new Map();
    data.studentClashes.forEach((clash) => {
      const list = clashesByStudent.get(clash.studentRoll) || [];
      list.push(clash);
      clashesByStudent.set(clash.studentRoll, list);
    });
    const candidates = data.rooms.filter((room) => room.usable).sort((a, b) =>
      roomStrategy === "fewestRooms"
        ? b.capacity - a.capacity || a.number.localeCompare(b.number) || a.id.localeCompare(b.id)
        : a.number.localeCompare(b.number) || a.id.localeCompare(b.id)
    );
    const students = data.students.filter((student) => !clashesByStudent.has(student.roll))
      .sort((a, b) => studentOrder === "rollAscending"
        ? a.roll.localeCompare(b.roll)
        : b.roll.localeCompare(a.roll));
    let chosenRooms = [];
    if (roomStrategy === "fewestRooms") {
      let remaining = students.length;
      for (const room of candidates) {
        if (remaining <= 0) break;
        chosenRooms.push(room);
        remaining -= room.capacity;
      }
    } else {
      let capacity = 0;
      for (const room of candidates) {
        if (capacity >= students.length) break;
        chosenRooms.push(room);
        capacity += room.capacity;
      }
    }
    const assignments = [];
    const usage = new Map(chosenRooms.map((room) => [room.id, 0]));
    if (roomStrategy === "fewestRooms") {
      let index = 0;
      for (const room of chosenRooms) {
        for (let seatNumber = 1; seatNumber <= room.capacity && index < students.length; seatNumber += 1) {
          assignments.push({
            studentRoll: students[index++].roll, roomId: room.id, seatNumber,
            invigilatorId: room.invigilatorId
          });
          usage.set(room.id, seatNumber);
        }
      }
    } else if (chosenRooms.length) {
      let cursor = 0;
      for (const student of students) {
        let room;
        for (let attempt = 0; attempt < chosenRooms.length; attempt += 1) {
          const candidate = chosenRooms[(cursor + attempt) % chosenRooms.length];
          if (usage.get(candidate.id) < candidate.capacity) {
            room = candidate;
            cursor = (cursor + attempt + 1) % chosenRooms.length;
            break;
          }
        }
        if (!room) break;
        const seatNumber = usage.get(room.id) + 1;
        assignments.push({ studentRoll: student.roll, roomId: room.id, seatNumber, invigilatorId: room.invigilatorId });
        usage.set(room.id, seatNumber);
      }
    }
    const assignedRolls = new Set(assignments.map((assignment) => assignment.studentRoll));
    return {
      ...data,
      assignments,
      unallocated: data.students.filter((student) => !assignedRolls.has(student.roll)).map((student) => ({
        ...student,
        reason: clashesByStudent.has(student.roll) ? "timetable clash" : "insufficient available room capacity",
        clashes: clashesByStudent.get(student.roll) || []
      })),
      rules: { roomStrategy, studentOrder }
    };
  }

  function validateAssignments(examId, assignments, roomIncharges = {}) {
    if (!Array.isArray(assignments)) throw statusError("Assignments must be a list.", 422);
    if (!roomIncharges || typeof roomIncharges !== "object" || Array.isArray(roomIncharges)) {
      throw statusError("Room in-charge assignments must be an object.", 422);
    }
    const data = allocationData(examId);
    if (data.exam.allocationStatus === "published") {
      throw statusError("Published seating cannot be changed.", 409);
    }
    const eligible = new Set(data.students.map((student) => student.roll));
    const clashes = new Set(data.studentClashes.map((clash) => clash.studentRoll));
    const rooms = new Map(data.rooms.map((room) => [room.id, room]));
    const students = new Set();
    const seats = new Set();
    const roomCounts = new Map();
    const assignmentsByRoom = new Map();
    for (const assignment of assignments) {
      if (!assignment || typeof assignment.studentRoll !== "string" ||
          typeof assignment.roomId !== "string" || !Number.isSafeInteger(assignment.seatNumber) ||
          assignment.seatNumber < 1) {
        throw statusError("Every seat must include a student, room, and positive integer seat number.", 422);
      }
      if (!eligible.has(assignment.studentRoll)) throw statusError("Allocation contains a student who is not eligible for this examination.", 422);
      if (clashes.has(assignment.studentRoll)) throw statusError(`Student ${assignment.studentRoll} has a timetable clash.`, 409);
      if (students.has(assignment.studentRoll)) throw statusError(`Student ${assignment.studentRoll} is assigned more than once.`, 409);
      students.add(assignment.studentRoll);
      const room = rooms.get(assignment.roomId);
      if (!room || !room.usable) throw statusError(`Room ${assignment.roomId} is unavailable or has a timetable clash.`, 409);
      if (assignment.seatNumber > room.capacity) throw statusError(`Seat ${assignment.seatNumber} exceeds room ${room.number}'s capacity.`, 422);
      const seatKey = `${assignment.roomId}:${assignment.seatNumber}`;
      if (seats.has(seatKey)) throw statusError(`Seat ${assignment.seatNumber} is assigned more than once in room ${room.number}.`, 409);
      seats.add(seatKey);
      roomCounts.set(room.id, (roomCounts.get(room.id) || 0) + 1);
      const list = assignmentsByRoom.get(room.id) || [];
      list.push(assignment);
      assignmentsByRoom.set(room.id, list);
    }
    for (const [roomId, count] of roomCounts) {
      if (count > rooms.get(roomId).capacity) throw statusError(`Room ${rooms.get(roomId).number} exceeds its seating capacity.`, 422);
    }
    const storedAttendance = db.prepare(`
      SELECT COUNT(*) AS count FROM attendance_records WHERE exam_id = ?
    `).get(examId).count;
    const finalizedAttendance = db.prepare(`
      SELECT COUNT(*) AS count FROM attendance_sessions WHERE exam_id = ? AND submitted_at IS NOT NULL
    `).get(examId).count;
    if (finalizedAttendance) throw statusError("Seating cannot be changed after attendance has been submitted.", 409);
    if (storedAttendance) {
      if (membershipKey(data.assignments) !== membershipKey(assignments)) {
        throw statusError("Room membership cannot change after attendance has been recorded.", 409);
      }
    }
    const currentRoomAssignments = new Map(data.rooms.map((room) => [room.id, room.invigilatorId]));
    const finalIncharges = {};
    for (const roomId of assignmentsByRoom.keys()) {
      const invigilatorId = roomIncharges[roomId] || currentRoomAssignments.get(roomId);
      if (typeof invigilatorId !== "string" || !invigilatorId ||
          (validInvigilators.size && !validInvigilators.has(invigilatorId))) {
        throw statusError(`Select a valid in-charge for room ${rooms.get(roomId).number}.`, 422);
      }
      finalIncharges[roomId] = invigilatorId;
    }
    return { data, assignmentsByRoom, finalIncharges };
  }

  function saveDraft({ examId, assignments, roomIncharges = {}, actorId }) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const { data, finalIncharges } = validateAssignments(examId, assignments, roomIncharges);
      const hasAttendance = db.prepare("SELECT COUNT(*) AS count FROM attendance_records WHERE exam_id = ?").get(examId).count > 0;
      const previousAssignments = data.assignments.map((assignment) => ({
        studentRoll: assignment.studentRoll, roomId: assignment.roomId, seatNumber: assignment.seatNumber
      }));
      if (!hasAttendance || membershipKey(data.assignments) !== membershipKey(assignments)) {
        db.prepare("DELETE FROM allocations WHERE exam_id = ?").run(examId);
      }
      if (!hasAttendance) {
        const deleteSession = db.prepare("DELETE FROM attendance_sessions WHERE exam_id = ? AND room_id = ?");
        const deleteRoom = db.prepare("DELETE FROM room_assignments WHERE exam_id = ? AND room_id = ?");
        for (const room of data.rooms) {
          if (room.invigilatorId && !Object.hasOwn(finalIncharges, room.id)) {
            deleteSession.run(examId, room.id);
            deleteRoom.run(examId, room.id);
          }
        }
      }
      const addRoom = db.prepare(`
        INSERT INTO room_assignments (exam_id, room_id, invigilator_id) VALUES (?, ?, ?)
        ON CONFLICT (exam_id, room_id) DO UPDATE SET invigilator_id = excluded.invigilator_id
      `);
      for (const [roomId, inchargeId] of Object.entries(finalIncharges)) addRoom.run(examId, roomId, inchargeId);
      const putSeat = db.prepare(`
        INSERT INTO allocations (exam_id, room_id, student_roll, seat_number) VALUES (?, ?, ?, ?)
        ON CONFLICT (exam_id, room_id, student_roll) DO UPDATE SET seat_number = excluded.seat_number
      `);
      if (hasAttendance) {
        const maxOldSeat = previousAssignments.reduce((max, assignment) => Math.max(max, assignment.seatNumber), 0);
        const maxNewSeat = assignments.reduce((max, assignment) => Math.max(max, assignment.seatNumber), 0);
        const seatOffset = maxOldSeat + maxNewSeat + 1;
        if (!Number.isSafeInteger(seatOffset)) throw statusError("Seat numbers are outside the supported range.", 422);
        db.prepare("UPDATE allocations SET seat_number = seat_number + ? WHERE exam_id = ?").run(seatOffset, examId);
      }
      for (const assignment of assignments) {
        putSeat.run(examId, assignment.roomId, assignment.studentRoll, assignment.seatNumber);
      }
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO allocation_audit (exam_id, event_type, actor_id, occurred_at, details)
        VALUES (?, 'draft_saved', ?, ?, ?)
      `).run(examId, actorId, now, JSON.stringify({
        previousAssignments,
        assignments: assignments.map(({ studentRoll, roomId, seatNumber }) => ({ studentRoll, roomId, seatNumber })),
        rooms: Object.keys(finalIncharges)
      }));
      db.prepare("UPDATE examinations SET allocation_status = 'draft' WHERE id = ?").run(examId);
      db.exec("COMMIT");
      return allocationData(examId);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function publish({ examId, actorId }) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const data = allocationData(examId);
      if (data.exam.allocationStatus === "published") throw statusError("Seating has already been published.", 409);
      if (!data.students.length) throw statusError("An examination with no eligible students cannot be published.", 422);
      const eligible = new Set(data.students.map((student) => student.roll));
      const assigned = new Set(data.assignments.map((assignment) => assignment.studentRoll));
      const missing = [...eligible].filter((roll) => !assigned.has(roll));
      if (missing.length) throw statusError(`${missing.length} eligible student(s) are not allocated.`, 422);
      validateAssignments(examId, data.assignments, {});
      const now = new Date().toISOString();
      const result = db.prepare(`
        UPDATE examinations SET allocation_status = 'published', published_at = ?, published_by = ?
        WHERE id = ? AND allocation_status = 'draft'
      `).run(now, actorId, examId);
      if (result.changes !== 1) throw statusError("Seating has already been published.", 409);
      db.prepare(`
        INSERT INTO allocation_audit (exam_id, event_type, actor_id, occurred_at, details)
        VALUES (?, 'published', ?, ?, ?)
      `).run(examId, actorId, now, JSON.stringify({ assigned: data.assignments.length }));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return allocationData(examId);
  }

  function csv(examId) {
    const data = allocationData(examId);
    const quote = (value) => {
      const text = String(value ?? "");
      const safe = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = [["Examination", "Course code", "Course", "Date", "Session", "Department", "Section", "Room", "Building", "Seat", "Roll number", "Student name"]];
    const students = new Map(data.students.map((student) => [student.roll, student]));
    const rooms = new Map(data.rooms.map((room) => [room.id, room]));
    data.assignments.forEach((assignment) => {
      const student = students.get(assignment.studentRoll);
      const room = rooms.get(assignment.roomId);
      rows.push([data.exam.name, data.exam.code, data.exam.course, data.exam.date, data.exam.session,
        data.exam.department, data.exam.section, room?.number, room?.building, assignment.seatNumber,
        student?.roll, student?.name]);
    });
    return rows.map((row) => row.map(quote).join(",")).join("\r\n");
  }

  return { listExams, allocationData, propose, saveDraft, publish, csv };
}

module.exports = { createSeatingService };
