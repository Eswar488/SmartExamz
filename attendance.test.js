"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { migrateAttendanceDatabase, createAttendanceService } = require("./attendance-service.js");
const attendanceApi = require("./attendance-api.js");
const { createAppServer } = require("./server.js");

function makeFixture() {
  const db = new DatabaseSync(":memory:");
  migrateAttendanceDatabase(db);
  db.exec(`
    INSERT INTO students (roll, name, department, section, year) VALUES ('S1', 'Student One', 'Computer Science', 'A', 2);
    INSERT INTO students (roll, name, department, section, year) VALUES ('S2', 'Student Two', 'Computer Science', 'A', 2);
    INSERT INTO students (roll, name, department, section, year) VALUES ('S3', 'Student Three', 'Computer Science', 'A', 2);
    INSERT INTO examinations (id, name, code, course, exam_date, session, department, year, section)
      VALUES ('E1', 'Midterm', 'CS1', 'Algorithms', '2026-11-01', 'Morning', 'Computer Science', 2, 'A');
    INSERT INTO rooms (id, number, building, capacity) VALUES ('R1', 'A-101', 'A Block', 40);
    INSERT INTO rooms (id, number, building, capacity) VALUES ('R2', 'A-102', 'A Block', 50);
    INSERT INTO room_assignments VALUES ('E1', 'R1', 'invigilator-1');
    INSERT INTO room_assignments VALUES ('E1', 'R2', 'invigilator-2');
    INSERT INTO allocations VALUES ('E1', 'R1', 'S1', 1);
    INSERT INTO allocations VALUES ('E1', 'R1', 'S2', 2);
    INSERT INTO allocations VALUES ('E1', 'R2', 'S3', 1);
    INSERT INTO exam_eligibility VALUES ('E1', 'S1');
    INSERT INTO exam_eligibility VALUES ('E1', 'S2');
    INSERT INTO exam_eligibility VALUES ('E1', 'S3');
    INSERT INTO attendance_sessions (exam_id, room_id) VALUES ('E1', 'R1');
    INSERT INTO attendance_sessions (exam_id, room_id) VALUES ('E1', 'R2');
  `);
  return { db, service: createAttendanceService(db) };
}

function expectStatus(status) {
  return (error) => error.status === status;
}

test("only supported statuses are accepted and allocated students can be marked unmarked", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  assert.throws(() => service.changeAttendance({
    examId: "E1", roomId: "R1", studentRoll: "S1", status: "late", actorId: "invigilator-1"
  }), expectStatus(422));
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S1", status: "present", actorId: "invigilator-1" });
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S1", status: "unmarked", actorId: "invigilator-1" });
  assert.equal(service.getAttendance("E1", "R1", "invigilator-1").counts.unmarked, 2);
  assert.throws(() => service.changeAttendance({
    examId: "E1", roomId: "R1", studentRoll: "S3", status: "absent", actorId: "invigilator-1"
  }), expectStatus(404));
});

test("submission is blocked until every allocated student has a valid mark", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S1", status: "present", actorId: "invigilator-1" });
  assert.throws(() => service.submitAttendance({
    examId: "E1", roomId: "R1", actorId: "invigilator-1"
  }), expectStatus(422));
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S2", status: "absent", actorId: "invigilator-1" });
  const receipt = service.submitAttendance({ examId: "E1", roomId: "R1", actorId: "invigilator-1" });
  assert.deepEqual(receipt.counts, { present: 1, absent: 1, unmarked: 0 });
  assert.equal(receipt.exam.code, "CS1");
  assert.equal(receipt.exam.room_number, "A-101");
  assert.ok(Number.isFinite(Date.parse(receipt.submittedAt)));
  assert.equal(receipt.submittedBy, "invigilator-1");
});

test("submission and attendance rows cannot be duplicated", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S1", status: "present", actorId: "invigilator-1" });
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S2", status: "absent", actorId: "invigilator-1" });
  service.submitAttendance({ examId: "E1", roomId: "R1", actorId: "invigilator-1" });
  assert.throws(() => service.submitAttendance({
    examId: "E1", roomId: "R1", actorId: "invigilator-1"
  }), expectStatus(409));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM attendance_sessions WHERE exam_id = 'E1' AND room_id = 'R1'").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM attendance_records WHERE exam_id = 'E1' AND room_id = 'R1'").get().count, 2);
});

test("only the assigned invigilator can view, mark, or submit a room", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  assert.throws(() => service.getAttendance("E1", "R1", "invigilator-2"), expectStatus(403));
  assert.throws(() => service.changeAttendance({
    examId: "E1", roomId: "R1", studentRoll: "S1", status: "present", actorId: "invigilator-2"
  }), expectStatus(403));
  assert.throws(() => service.submitAttendance({
    examId: "E1", roomId: "R1", actorId: "invigilator-2"
  }), expectStatus(403));
});

test("attendance edits create a unique record and append an audit event", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S1", status: "present", actorId: "invigilator-1" });
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S1", status: "present", actorId: "invigilator-1" });
  service.changeAttendance({ examId: "E1", roomId: "R1", studentRoll: "S1", status: "absent", actorId: "invigilator-1" });
  const rows = db.prepare(`
    SELECT status, updated_by FROM attendance_records WHERE exam_id = 'E1' AND room_id = 'R1' AND student_roll = 'S1'
  `).all();
  const audit = db.prepare(`
    SELECT old_status, new_status, actor_id FROM attendance_audit
    WHERE exam_id = 'E1' AND room_id = 'R1' AND student_roll = 'S1'
  `).all();
  assert.equal(rows.length, 1);
  assert.deepEqual([rows[0].status, rows[0].updated_by], ["absent", "invigilator-1"]);
  assert.equal(audit.length, 2);
  assert.deepEqual([audit[1].old_status, audit[1].new_status, audit[1].actor_id], ["present", "absent", "invigilator-1"]);
});

test("network failures are surfaced instead of appearing as saved attendance", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("connection refused"); };
  try {
    await assert.rejects(attendanceApi.updateStatus({
      examId: "E1", roomId: "R1", studentRoll: "S1", status: "present", token: "session"
    }), /Network error\. Attendance was not saved/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("server errors are surfaced to the attendance client", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ error: "Service unavailable." }), {
    status: 503, headers: { "Content-Type": "application/json" }
  });
  try {
    await assert.rejects(attendanceApi.submit({
      examId: "E1", roomId: "R1", token: "session"
    }), /Service unavailable/);
  } finally {
    global.fetch = originalFetch;
  }
});

test("HTTP API authenticates invigilators and checks assignment on protected routes", async (t) => {
  const { db } = makeFixture();
  const server = createAppServer({ db, credentials: { "invigilator-1": "test-password" } });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const invalidLogin = await fetch(`${origin}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invigilatorId: "invigilator-1", password: "wrong" })
  });
  assert.equal(invalidLogin.status, 401);

  const login = await fetch(`${origin}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invigilatorId: "invigilator-1", password: "test-password" })
  });
  assert.equal(login.status, 200);
  const { token } = await login.json();

  const unauthenticated = await fetch(`${origin}/api/attendance?examId=E1&roomId=R1`);
  assert.equal(unauthenticated.status, 401);
  const unassigned = await fetch(`${origin}/api/attendance?examId=E1&roomId=R2`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(unassigned.status, 403);
  const authorized = await fetch(`${origin}/api/attendance?examId=E1&roomId=R1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json()).counts.unmarked, 2);
});
