"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { migrateAttendanceDatabase } = require("./attendance-service.js");
const { createSeatingService } = require("./seating-service.js");
const { createAppServer } = require("./server.js");

function makeFixture({ roomClash = false, studentClash = false } = {}) {
  const db = new DatabaseSync(":memory:");
  migrateAttendanceDatabase(db);
  db.exec(`
    INSERT INTO students (roll, name, department, section, year) VALUES
      ('S1', 'Student One', 'Computing', 'A', 2),
      ('S2', 'Student Two', 'Computing', 'A', 2),
      ('S3', 'Student Three', 'Computing', 'A', 2);
    INSERT INTO examinations (id, name, code, course, exam_date, session, department, year, section)
      VALUES ('E1', 'Midterm', 'CS1', 'Algorithms', '2026-11-01', 'Morning', 'Computing', 2, 'A');
    INSERT INTO rooms (id, number, building, capacity) VALUES
      ('R1', 'A-101', 'A Block', 2),
      ('R2', 'A-102', 'A Block', 1),
      ('R3', 'B-101', 'B Block', 1);
    UPDATE rooms SET available = 0 WHERE id = 'R3';
    INSERT INTO room_assignments (exam_id, room_id, invigilator_id) VALUES ('E1', 'R1', 'invigilator-1');
    INSERT INTO exam_eligibility (exam_id, student_roll) VALUES ('E1', 'S1'), ('E1', 'S2'), ('E1', 'S3');
  `);
  if (roomClash || studentClash) {
    db.exec(`
      INSERT INTO examinations (id, name, code, course, exam_date, session, department, year, section)
        VALUES ('E2', 'Other exam', 'CS2', 'Networks', '2026-11-01', 'Morning', 'Computing', 2, 'A');
    `);
    if (roomClash) db.exec("INSERT INTO room_assignments (exam_id, room_id, invigilator_id) VALUES ('E2', 'R2', 'invigilator-2')");
    if (studentClash) db.exec("INSERT INTO exam_eligibility (exam_id, student_roll) VALUES ('E2', 'S3')");
  }
  return { db, service: createSeatingService(db, { invigilatorIds: ["invigilator-1", "invigilator-2"] }) };
}

function expectStatus(status) {
  return (error) => error.status === status;
}

test("deterministically proposes minimum-room seating and saves a capacity-safe draft", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  const proposal = service.propose({ examId: "E1" });
  assert.deepEqual(proposal.assignments.map(({ studentRoll, roomId, seatNumber }) => [studentRoll, roomId, seatNumber]), [
    ["S1", "R1", 1], ["S2", "R1", 2], ["S3", "R2", 1]
  ]);
  assert.equal(proposal.unallocated.length, 0);
  const saved = service.saveDraft({
    examId: "E1", assignments: proposal.assignments,
    roomIncharges: { R1: "invigilator-1", R2: "invigilator-2" }, actorId: "admin-1"
  });
  assert.equal(saved.assignments.length, 3);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM allocation_audit WHERE event_type = 'draft_saved'").get().count, 1);
});

test("server rejects duplicate students, duplicate seats, and seats beyond capacity", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  const duplicateStudent = [
    { studentRoll: "S1", roomId: "R1", seatNumber: 1 },
    { studentRoll: "S1", roomId: "R1", seatNumber: 2 }
  ];
  assert.throws(() => service.saveDraft({ examId: "E1", assignments: duplicateStudent, roomIncharges: { R1: "invigilator-1" }, actorId: "admin-1" }), expectStatus(409));
  const duplicateSeat = [
    { studentRoll: "S1", roomId: "R1", seatNumber: 1 },
    { studentRoll: "S2", roomId: "R1", seatNumber: 1 }
  ];
  assert.throws(() => service.saveDraft({ examId: "E1", assignments: duplicateSeat, roomIncharges: { R1: "invigilator-1" }, actorId: "admin-1" }), expectStatus(409));
  assert.throws(() => service.saveDraft({
    examId: "E1", assignments: [{ studentRoll: "S1", roomId: "R1", seatNumber: 3 }],
    roomIncharges: { R1: "invigilator-1" }, actorId: "admin-1"
  }), expectStatus(422));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM allocations WHERE exam_id = 'E1'").get().count, 0);
});

test("database indexes reject duplicate room seats and duplicate exam student allocations", (t) => {
  const { db } = makeFixture();
  t.after(() => db.close());
  db.exec("INSERT INTO allocations (exam_id, room_id, student_roll, seat_number) VALUES ('E1', 'R1', 'S1', 1)");
  assert.throws(() => db.exec("INSERT INTO allocations (exam_id, room_id, student_roll, seat_number) VALUES ('E1', 'R1', 'S2', 1)"));
  db.exec("INSERT INTO room_assignments (exam_id, room_id, invigilator_id) VALUES ('E1', 'R2', 'invigilator-2')");
  assert.throws(() => db.exec("INSERT INTO allocations (exam_id, room_id, student_roll, seat_number) VALUES ('E1', 'R2', 'S1', 1)"));
});

test("database capacity triggers reject excess allocation and unsafe room downsizing", (t) => {
  const { db } = makeFixture();
  t.after(() => db.close());
  db.exec(`
    INSERT INTO allocations (exam_id, room_id, student_roll, seat_number) VALUES
      ('E1', 'R1', 'S1', 1),
      ('E1', 'R1', 'S2', 2);
  `);
  assert.throws(() => db.exec("INSERT INTO allocations (exam_id, room_id, student_roll, seat_number) VALUES ('E1', 'R1', 'S3', 3)"));
  assert.throws(() => db.exec("UPDATE rooms SET capacity = 1 WHERE id = 'R1'"));
});

test("room timetable conflicts are excluded from proposals and rejected on writes", (t) => {
  const { db, service } = makeFixture({ roomClash: true });
  t.after(() => db.close());
  db.exec("INSERT INTO room_assignments (exam_id, room_id, invigilator_id) VALUES ('E1', 'R2', 'invigilator-1')");
  const proposal = service.propose({ examId: "E1" });
  assert.ok(proposal.rooms.find((room) => room.id === "R2").usable === 0);
  assert.equal(proposal.assignments.length, 2);
  assert.equal(proposal.unallocated.length, 1);
  assert.throws(() => service.saveDraft({
    examId: "E1", assignments: [{ studentRoll: "S1", roomId: "R2", seatNumber: 1 }],
    roomIncharges: { R2: "invigilator-1" }, actorId: "admin-1"
  }), expectStatus(409));
});

test("eligible students with same-session examinations are reported and cannot be assigned", (t) => {
  const { db, service } = makeFixture({ studentClash: true });
  t.after(() => db.close());
  const proposal = service.propose({ examId: "E1" });
  assert.deepEqual(proposal.studentClashes.map((clash) => [clash.studentRoll, clash.examId]), [["S3", "E2"]]);
  assert.ok(proposal.unallocated.some((student) => student.roll === "S3" && student.reason === "timetable clash"));
  assert.throws(() => service.saveDraft({
    examId: "E1", assignments: [{ studentRoll: "S3", roomId: "R1", seatNumber: 1 }],
    roomIncharges: { R1: "invigilator-1" }, actorId: "admin-1"
  }), expectStatus(409));
});

test("publication requires every eligible student and locks later regeneration", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  const proposal = service.propose({ examId: "E1" });
  service.saveDraft({
    examId: "E1", assignments: proposal.assignments,
    roomIncharges: { R1: "invigilator-1", R2: "invigilator-2" }, actorId: "admin-1"
  });
  const published = service.publish({ examId: "E1", actorId: "admin-1" });
  assert.equal(published.exam.allocationStatus, "published");
  assert.throws(() => service.propose({ examId: "E1" }), expectStatus(409));
  assert.throws(() => service.saveDraft({
    examId: "E1", assignments: proposal.assignments, roomIncharges: {}, actorId: "admin-1"
  }), expectStatus(409));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM allocation_audit WHERE event_type = 'published'").get().count, 1);
});

test("CSV export neutralizes spreadsheet formulas in student-controlled cells", (t) => {
  const { db, service } = makeFixture();
  t.after(() => db.close());
  db.prepare("UPDATE students SET name = ? WHERE roll = 'S1'").run("=HYPERLINK(\"https://example.invalid\")");
  service.saveDraft({
    examId: "E1",
    assignments: [{ studentRoll: "S1", roomId: "R1", seatNumber: 1 }],
    roomIncharges: { R1: "invigilator-1" },
    actorId: "admin-1"
  });
  assert.match(service.csv("E1"), /"'=HYPERLINK/);
});

test("allocation HTTP routes require administrator role and provide CSV only to authorized users", async (t) => {
  const { db } = makeFixture();
  const server = createAppServer({
    db,
    credentials: { "invigilator-1": "incharge-secret", "invigilator-2": "second-secret" },
    adminCredentials: { "admin-1": "admin-secret" }
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const unauthorized = await fetch(`${origin}/api/admin/exams/E1/allocation`);
  assert.equal(unauthorized.status, 401);

  const inchargeLogin = await fetch(`${origin}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invigilatorId: "invigilator-1", password: "incharge-secret" })
  });
  const { token: inchargeToken } = await inchargeLogin.json();
  const forbidden = await fetch(`${origin}/api/admin/exams/E1/allocation`, {
    headers: { Authorization: `Bearer ${inchargeToken}` }
  });
  assert.equal(forbidden.status, 403);

  const adminLogin = await fetch(`${origin}/api/auth/admin-login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "admin-1", password: "admin-secret" })
  });
  const { token } = await adminLogin.json();
  const examList = await fetch(`${origin}/api/admin/exams`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(examList.status, 200);
  assert.deepEqual((await examList.json()).exams.map((exam) => exam.id), ["E1"]);
  const response = await fetch(`${origin}/api/admin/exams/E1/allocation/propose`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ roomStrategy: "fewestRooms", studentOrder: "rollAscending" })
  });
  assert.equal(response.status, 200);
  const proposal = await response.json();
  assert.equal(proposal.assignments.length, 3);
  const save = await fetch(`${origin}/api/admin/exams/E1/allocation/draft`, {
    method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      assignments: proposal.assignments,
      roomIncharges: { R1: "invigilator-1", R2: "invigilator-2" }
    })
  });
  assert.equal(save.status, 200);
  const csv = await fetch(`${origin}/api/admin/exams/E1/allocation/csv`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /Student One/);
});

test("role-specific login rejects valid credentials submitted for the wrong role", async (t) => {
  const { db } = makeFixture();
  const server = createAppServer({
    db,
    credentials: { "invigilator-1": "incharge-secret" },
    adminCredentials: { "admin-1": "admin-secret" }
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const login = (path, userId, password, idField) => fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [idField]: userId, password })
  });

  assert.equal((await login("/api/auth/admin-login", "invigilator-1", "incharge-secret", "userId")).status, 401);
  assert.equal((await login("/api/auth/login", "admin-1", "admin-secret", "invigilatorId")).status, 401);
  assert.equal((await login("/api/auth/admin-login", "admin-1", "admin-secret", "userId")).status, 200);
  assert.equal((await login("/api/auth/login", "invigilator-1", "incharge-secret", "invigilatorId")).status, 200);
  assert.equal((await fetch(`${origin}/api/student/schedule`)).status, 404);
});

test("production server startup does not seed demonstration examinations", async (t) => {
  const db = new DatabaseSync(":memory:");
  const priorEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let server;
  try {
    server = createAppServer({ db });
  } finally {
    if (priorEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = priorEnvironment;
  }
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM examinations").get().count, 0);
});
