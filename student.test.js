"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const { migrateAttendanceDatabase } = require("./attendance-service.js");
const { createStudentService } = require("./student-service.js");
const { createAppServer } = require("./server.js");

function makeFixture() {
  const db = new DatabaseSync(":memory:");
  migrateAttendanceDatabase(db);
  db.exec(`
    INSERT INTO students (roll, name, department, section, year) VALUES
      ('S1', 'Student One', 'Computer Science', 'A', 2),
      ('S2', 'Student Two', 'Electronics', 'B', 3);
    INSERT INTO examinations (id, name, code, course, exam_date, session, department, year, section, allocation_status)
      VALUES ('E1', 'Midterm', 'CS1', 'Algorithms', date('now', '+1 day'), 'Morning', 'Computer Science', 2, 'A', 'published'),
             ('E2', 'Draft Exam', 'EC2', 'Circuits', date('now', '+2 day'), 'Afternoon', 'Electronics', 3, 'B', 'draft');
    INSERT INTO rooms (id, number, building, capacity) VALUES
      ('R1', 'A-101', 'A Block', 10),
      ('R2', 'B-202', 'B Block', 10);
    INSERT INTO room_assignments VALUES ('E1', 'R1', 'invigilator-1');
    INSERT INTO room_assignments VALUES ('E2', 'R2', 'invigilator-2');
    INSERT INTO allocations VALUES ('E1', 'R1', 'S1', 1);
    INSERT INTO allocations VALUES ('E1', 'R1', 'S2', 2);
    INSERT INTO allocations VALUES ('E2', 'R2', 'S1', 1);
  `);
  return db;
}

test("schema version 2 upgrades to student accounts without modifying existing roster rows", (t) => {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec(`
    CREATE TABLE students (
      roll TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT NOT NULL,
      section TEXT NOT NULL,
      year INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO students VALUES ('S1', 'Student One', 'Computer Science', 'A', 2);
    PRAGMA user_version = 2;
  `);
  migrateAttendanceDatabase(db);
  assert.equal(db.prepare("PRAGMA user_version").get().user_version, 3);
  assert.deepEqual({ ...db.prepare("SELECT roll, name, email FROM students").get() }, {
    roll: "S1", name: "Student One", email: null
  });
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM student_accounts").get().count, 0);
  assert.throws(() => db.prepare(`
    INSERT INTO student_accounts (student_roll, password_salt, password_hash, created_at, updated_at)
    VALUES ('MISSING', 'salt', 'hash', 'now', 'now')
  `).run(), (error) => error.errcode === 787);
});

function jsonRequest(origin, pathname, { method = "GET", token, body } = {}) {
  return fetch(`${origin}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

async function login(origin, pathname, body) {
  const response = await jsonRequest(origin, pathname, { method: "POST", body });
  return { response, body: await response.json() };
}

test("admin provisions an existing roster student, auditing without returning password material", async (t) => {
  const db = makeFixture();
  const server = createAppServer({ db, adminCredentials: { "admin-1": "admin-secret" } });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { body: admin } = await login(origin, "/api/auth/admin-login", {
    userId: "admin-1", password: "admin-secret"
  });

  const unauthorized = await jsonRequest(origin, "/api/admin/student-accounts", {
    method: "POST", body: { studentRoll: "S1", password: "correct-horse-battery" }
  });
  assert.equal(unauthorized.status, 401);
  const unauthorizedRoster = await jsonRequest(origin, "/api/admin/students", {
    method: "POST", body: { roll: "S3", name: "Student Three", department: "Physics", year: 1, section: "A" }
  });
  assert.equal(unauthorizedRoster.status, 401);

  const rosterStudent = await jsonRequest(origin, "/api/admin/students", {
    method: "POST", token: admin.token,
    body: { roll: "S3", name: "Student Three", department: "Physics", year: 1, section: "A" }
  });
  assert.equal(rosterStudent.status, 201);
  assert.equal((await rosterStudent.json()).roll, "S3");
  const duplicateRosterStudent = await jsonRequest(origin, "/api/admin/students", {
    method: "POST", token: admin.token,
    body: { roll: "S3", name: "Another Student", department: "Physics", year: 1, section: "A" }
  });
  assert.equal(duplicateRosterStudent.status, 409);
  const invalidRosterStudent = await jsonRequest(origin, "/api/admin/students", {
    method: "POST", token: admin.token,
    body: { roll: "S4", name: " ", department: "Physics", year: 1, section: "A" }
  });
  assert.equal(invalidRosterStudent.status, 400);
  const invalidRosterStudents = [
    { roll: "S4", name: "Student Four", department: "Physics", year: 0, section: "A" },
    { roll: "S4", name: "Student Four", department: "", year: 1, section: "A" },
    { roll: "S4", name: "Student Four", department: "Physics", year: 1, section: " " },
  ];
  for (const student of invalidRosterStudents) {
    const response = await jsonRequest(origin, "/api/admin/students", {
      method: "POST", token: admin.token, body: student
    });
    assert.equal(response.status, 400);
  }

  const invalidPassword = await jsonRequest(origin, "/api/admin/student-accounts", {
    method: "POST", token: admin.token,
    body: { studentRoll: "S1", password: "short" }
  });
  assert.equal(invalidPassword.status, 400);

  const missingRosterRecord = await jsonRequest(origin, "/api/admin/student-accounts", {
    method: "POST", token: admin.token,
    body: { studentRoll: "UNKNOWN", password: "correct-horse-battery" }
  });
  assert.equal(missingRosterRecord.status, 404);

  const provisioned = await jsonRequest(origin, "/api/admin/student-accounts", {
    method: "POST", token: admin.token,
    body: { studentRoll: "S1", email: "S1@example.edu", password: "correct-horse-battery" }
  });
  assert.equal(provisioned.status, 201);
  const result = await provisioned.json();
  assert.deepEqual(Object.keys(result).sort(), ["email", "provisionedAt", "studentRoll"]);
  assert.equal(result.email, "s1@example.edu");
  const stored = db.prepare(`
    SELECT a.password_salt, a.password_hash, s.email
    FROM student_accounts a JOIN students s ON s.roll = a.student_roll
    WHERE a.student_roll = 'S1'
  `).get();
  assert.equal(stored.email, "s1@example.edu");
  assert.notEqual(stored.password_hash, "correct-horse-battery");
  assert.notEqual(stored.password_salt, stored.password_hash);
  assert.equal(db.prepare("SELECT action FROM audit_events WHERE actor_id = 'admin-1' AND entity_type = 'student_account'").get().action, "student_account.provisioned");

  const duplicateEmail = await jsonRequest(origin, "/api/admin/student-accounts", {
    method: "POST", token: admin.token,
    body: { studentRoll: "S2", email: "S1@EXAMPLE.EDU", password: "another-correct-password" }
  });
  assert.equal(duplicateEmail.status, 409);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM student_accounts WHERE student_roll = 'S2'").get().count, 0);
});

test("student roster creation rolls back and reports database write failures", async (t) => {
  const db = makeFixture();
  const server = createAppServer({ db, adminCredentials: { "admin-1": "admin-secret" } });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { body: admin } = await login(origin, "/api/auth/admin-login", {
    userId: "admin-1", password: "admin-secret"
  });

  db.exec("DROP TABLE audit_events");
  const response = await jsonRequest(origin, "/api/admin/students", {
    method: "POST",
    token: admin.token,
    body: { roll: "S5", name: "Student Five", department: "Physics", year: 1, section: "A" }
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Attendance service is temporarily unavailable." });
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM students WHERE roll = 'S5'").get().count, 0);
});

test("student login accepts roll or provisioned email and rejects invalid credentials and other roles", async (t) => {
  const db = makeFixture();
  const service = createStudentService(db);
  await service.provisionAccount({ studentRoll: "S1", email: "student.one@example.edu", password: "correct-horse-battery" }, "admin-1");
  const server = createAppServer({
    db,
    adminCredentials: { "admin-1": "admin-secret" },
    credentials: { "invigilator-1": "incharge-secret" }
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const wrongPassword = await login(origin, "/api/auth/student-login", { userId: "S1", password: "wrong-password" });
  assert.equal(wrongPassword.response.status, 401);
  const unknownAccount = await login(origin, "/api/auth/student-login", { userId: "UNKNOWN", password: "wrong-password" });
  assert.equal(unknownAccount.response.status, 401);
  assert.equal(wrongPassword.body.error, unknownAccount.body.error);

  assert.equal((await login(origin, "/api/auth/student-login", { userId: "admin-1", password: "admin-secret" })).response.status, 401);
  assert.equal((await login(origin, "/api/auth/student-login", { userId: "invigilator-1", password: "incharge-secret" })).response.status, 401);
  const byRoll = await login(origin, "/api/auth/student-login", { userId: "s1", password: "correct-horse-battery" });
  assert.equal(byRoll.response.status, 200);
  assert.equal(byRoll.body.role, "student");
  assert.equal(byRoll.body.studentRoll, "S1");
  const byEmail = await login(origin, "/api/auth/student-login", { userId: "STUDENT.ONE@EXAMPLE.EDU", password: "correct-horse-battery" });
  assert.equal(byEmail.response.status, 200);
  assert.equal(byEmail.body.studentRoll, "S1");
});

test("administrator provisions from the roster and student completes login-to-dashboard request flow", async (t) => {
  const db = makeFixture();
  const server = createAppServer({
    db,
    adminCredentials: { "admin-1": "admin-secret" },
    credentials: { "invigilator-1": "incharge-secret" }
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  const adminLogin = await login(origin, "/api/auth/admin-login", {
    userId: "admin-1", password: "admin-secret"
  });
  assert.equal(adminLogin.response.status, 200);
  assert.equal(adminLogin.body.role, "admin");
  const roster = await jsonRequest(origin, "/api/admin/students", { token: adminLogin.body.token });
  assert.equal(roster.status, 200);
  assert.equal((await roster.json()).students[0].accountEnabled, 0);
  const unprovisionedLogin = await login(origin, "/api/auth/student-login", {
    userId: "S1", password: "temporary-student-secret"
  });
  assert.equal(unprovisionedLogin.response.status, 401);

  const provisioned = await jsonRequest(origin, "/api/admin/student-accounts", {
    method: "POST",
    token: adminLogin.body.token,
    body: { studentRoll: "S1", email: "student@example.edu", password: "temporary-student-secret" }
  });
  assert.equal(provisioned.status, 201);
  const accounts = await jsonRequest(origin, "/api/admin/students", { token: adminLogin.body.token });
  assert.equal((await accounts.json()).students.find((student) => student.roll === "S1").accountEnabled, 1);

  const studentLogin = await login(origin, "/api/auth/student-login", {
    userId: "student@example.edu", password: "temporary-student-secret"
  });
  assert.equal(studentLogin.response.status, 200);
  assert.equal(studentLogin.body.role, "student");
  const dashboard = await jsonRequest(origin, "/api/student/dashboard", { token: studentLogin.body.token });
  assert.equal(dashboard.status, 200);
  const result = await dashboard.json();
  assert.equal(result.student.roll, "S1");
  assert.deepEqual(result.examinations.map((exam) => exam.examinationId), ["E1"]);

  assert.equal((await jsonRequest(origin, "/api/student/dashboard", { token: adminLogin.body.token })).status, 403);
  assert.equal((await jsonRequest(origin, "/api/admin/students", { token: studentLogin.body.token })).status, 403);
  const inchargeLogin = await login(origin, "/api/auth/login", {
    invigilatorId: "invigilator-1", password: "incharge-secret"
  });
  assert.equal(inchargeLogin.response.status, 200);
  assert.equal(inchargeLogin.body.role, "incharge");
  assert.equal((await jsonRequest(origin, "/api/student/dashboard", { token: inchargeLogin.body.token })).status, 403);
});

test("student dashboard exposes only the authenticated student's published schedule", async (t) => {
  const db = makeFixture();
  const service = createStudentService(db);
  await service.provisionAccount({ studentRoll: "S1", password: "correct-horse-battery" }, "admin-1");
  await service.provisionAccount({ studentRoll: "S2", password: "another-correct-password" }, "admin-1");
  const server = createAppServer({ db });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const unauthorized = await jsonRequest(origin, "/api/student/dashboard");
  assert.equal(unauthorized.status, 401);
  const { body: session } = await login(origin, "/api/auth/student-login", {
    userId: "S1", password: "correct-horse-battery"
  });

  const response = await jsonRequest(origin, "/api/student/dashboard?studentRoll=S2", { token: session.token });
  assert.equal(response.status, 200);
  const dashboard = await response.json();
  assert.equal(dashboard.student.roll, "S1");
  assert.deepEqual(dashboard.examinations.map((exam) => exam.examinationId), ["E1"]);
  assert.deepEqual(dashboard.examinations[0], {
    examinationId: "E1", examinationName: "Midterm", date: db.prepare("SELECT exam_date FROM examinations WHERE id='E1'").get().exam_date,
    session: "Morning", courseCode: "CS1", courseName: "Algorithms",
    roomNumber: "A-101", building: "A Block", seatNumber: 1
  });
  assert.equal(dashboard.resultsAvailable, false);
  assert.equal(JSON.stringify(dashboard).includes("password_hash"), false);

  assert.equal((await jsonRequest(origin, "/api/admin/exams", { token: session.token })).status, 403);
  assert.equal((await jsonRequest(origin, "/api/attendance?examId=E1&roomId=R1", { token: session.token })).status, 403);
  assert.equal((await jsonRequest(origin, "/api/admin/student-accounts", {
    method: "POST", token: session.token,
    body: { studentRoll: "S2", password: "something-long-enough" }
  })).status, 403);
});

test("student logout revokes access and expired sessions are rejected", async (t) => {
  const db = makeFixture();
  await createStudentService(db).provisionAccount({
    studentRoll: "S1", password: "correct-horse-battery"
  }, "admin-1");
  const server = createAppServer({ db, sessionLifetimeMs: 500 });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { body: session } = await login(origin, "/api/auth/student-login", {
    userId: "S1", password: "correct-horse-battery"
  });

  await new Promise((resolve) => setTimeout(resolve, 520));
  assert.equal((await jsonRequest(origin, "/api/student/dashboard", { token: session.token })).status, 401);

  const { body: freshSession } = await login(origin, "/api/auth/student-login", {
    userId: "S1", password: "correct-horse-battery"
  });
  assert.equal((await jsonRequest(origin, "/api/auth/logout", { method: "POST", token: freshSession.token })).status, 200);
  assert.equal((await jsonRequest(origin, "/api/student/dashboard", { token: freshSession.token })).status, 401);
});

test("student login does not reveal whether an account exists", async (t) => {
  const db = makeFixture();
  const server = createAppServer({ db });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const body = await jsonRequest(origin, "/api/auth/student-login", {
    method: "POST", body: { userId: "S1", password: "not-provisioned" }
  }).then((response) => response.json());
  assert.equal(body.error, "Invalid student credentials.");
});

test("student login client surfaces network failures", async () => {
  const studentApi = require("./student-api.js");
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error("connection refused"); };
  try {
    await assert.rejects(studentApi.login({ userId: "S1", password: "password" }), /network error/i);
  } finally {
    global.fetch = originalFetch;
  }
});
