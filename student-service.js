"use strict";

const crypto = require("node:crypto");

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_OPTIONS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};
const DUMMY_SALT = Buffer.alloc(16, 1);
const DUMMY_HASH = crypto.scryptSync("not-a-real-student-password", DUMMY_SALT, PASSWORD_KEY_LENGTH, PASSWORD_OPTIONS);

function derivePassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, PASSWORD_KEY_LENGTH, PASSWORD_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function normalizeEmail(email) {
  if (email === undefined || email === null || email === "") return null;
  if (typeof email !== "string") throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw Object.assign(new Error("Enter a valid email address."), { status: 400 });
  }
  return normalized;
}

function validateProvisioningInput(input) {
  if (!input || typeof input.studentRoll !== "string" || !/^[A-Za-z0-9._/-]{1,64}$/.test(input.studentRoll.trim())) {
    throw Object.assign(new Error("Enter a valid student ID."), { status: 400 });
  }
  if (typeof input.password !== "string" || input.password.length < 12 || input.password.length > 256) {
    throw Object.assign(new Error("Student passwords must contain between 12 and 256 characters."), { status: 400 });
  }
  return {
    studentRoll: input.studentRoll.trim(),
    email: normalizeEmail(input.email),
    password: input.password,
  };
}

function validateRosterStudent(input) {
  if (!input || typeof input !== "object") {
    throw Object.assign(new Error("Student details are required."), { status: 400 });
  }
  const student = {
    roll: typeof input.roll === "string" ? input.roll.trim() : "",
    name: typeof input.name === "string" ? input.name.trim() : "",
    department: typeof input.department === "string" ? input.department.trim() : "",
    section: typeof input.section === "string" ? input.section.trim() : "",
    year: Number(input.year),
  };
  if (!/^[A-Za-z0-9._/-]{1,64}$/.test(student.roll)
    || !student.name || student.name.length > 160
    || !student.department || student.department.length > 120
    || !student.section || student.section.length > 32
    || !Number.isInteger(student.year) || student.year < 1 || student.year > 8) {
    throw Object.assign(new Error("Enter a valid student ID, name, department, year, and section."), { status: 400 });
  }
  return student;
}

function createStudentService(db) {
  return {
    listRosterStudents() {
      return db.prepare(`
        SELECT
          s.roll,
          s.name,
          s.department,
          s.section,
          s.year,
          s.email,
          CASE WHEN a.student_roll IS NULL THEN 0 ELSE 1 END AS accountEnabled
        FROM students s
        LEFT JOIN student_accounts a ON a.student_roll = s.roll AND a.enabled = 1
        ORDER BY s.roll
      `).all();
    },

    createRosterStudent(input, actorId) {
      const student = validateRosterStudent(input);
      const now = new Date().toISOString();
      try {
        db.exec("BEGIN IMMEDIATE");
        db.prepare(`
          INSERT INTO students (roll, name, department, section, year)
          VALUES (?, ?, ?, ?, ?)
        `).run(student.roll, student.name, student.department, student.section, student.year);
        db.prepare(`
          INSERT INTO audit_events (actor_id, action, entity_type, entity_id, details, created_at)
          VALUES (?, 'student.roster_created', 'student', ?, ?, ?)
        `).run(actorId, student.roll, "{}", now);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        if (error.errcode === 1555 || error.errcode === 2067) {
          throw Object.assign(new Error("A student with that ID already exists."), { status: 409 });
        }
        throw error;
      }
      return { ...student, createdAt: now };
    },

    async provisionAccount(input, actorId) {
      const account = validateProvisioningInput(input);
      const student = db.prepare(
        "SELECT roll, email FROM students WHERE lower(roll) = lower(?)"
      ).get(account.studentRoll);
      if (!student) throw Object.assign(new Error("No roster student matches that student ID."), { status: 404 });
      const email = account.email ?? student.email ?? null;

      const salt = crypto.randomBytes(16);
      const hash = await derivePassword(account.password, salt);
      const now = new Date().toISOString();

      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("UPDATE students SET email = ? WHERE roll = ?").run(email, student.roll);
        db.prepare(`
          INSERT INTO student_accounts (student_roll, password_salt, password_hash, enabled, created_at, updated_at)
          VALUES (?, ?, ?, 1, ?, ?)
          ON CONFLICT(student_roll) DO UPDATE SET
            password_salt = excluded.password_salt,
            password_hash = excluded.password_hash,
            enabled = 1,
            updated_at = excluded.updated_at
        `).run(student.roll, salt.toString("hex"), hash.toString("hex"), now, now);
        db.prepare(`
          INSERT INTO audit_events (actor_id, action, entity_type, entity_id, details, created_at)
          VALUES (?, 'student_account.provisioned', 'student_account', ?, ?, ?)
        `).run(actorId, student.roll, JSON.stringify({ emailProvided: Boolean(email) }), now);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        if (error.errcode === 2067) {
          throw Object.assign(new Error("That email address is already associated with another student."), { status: 409 });
        }
        throw error;
      }

      return { studentRoll: student.roll, email, provisionedAt: now };
    },

    async authenticate(identifier, password) {
      const safeIdentifier = typeof identifier === "string" ? identifier.trim() : "";
      const validPasswordInput = typeof password === "string" && password.length <= 1024;
      const account = safeIdentifier && validPasswordInput
        ? db.prepare(`
          SELECT s.roll, a.password_salt, a.password_hash
          FROM students s
          JOIN student_accounts a ON a.student_roll = s.roll
          WHERE a.enabled = 1
            AND (lower(s.roll) = lower(?) OR lower(s.email) = lower(?))
        `).get(safeIdentifier, safeIdentifier)
        : undefined;
      const salt = account ? Buffer.from(account.password_salt, "hex") : DUMMY_SALT;
      const expected = account ? Buffer.from(account.password_hash, "hex") : DUMMY_HASH;
      const candidate = await derivePassword(validPasswordInput ? password : "", salt);
      const valid = candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
      if (!account || !valid) return null;
      return { studentRoll: account.roll };
    },

    getDashboard(studentRoll) {
      const student = db.prepare(`
        SELECT roll, name, email, department, section, year
        FROM students
        WHERE roll = ?
      `).get(studentRoll);
      if (!student) throw Object.assign(new Error("Student profile is unavailable."), { status: 404 });

      const examinations = db.prepare(`
        SELECT
          e.id AS examinationId,
          e.name AS examinationName,
          e.exam_date AS date,
          e.session,
          e.code AS courseCode,
          e.course AS courseName,
          r.number AS roomNumber,
          r.building AS building,
          a.seat_number AS seatNumber
        FROM allocations a
        JOIN examinations e ON e.id = a.exam_id
        JOIN rooms r ON r.id = a.room_id
        WHERE a.student_roll = ?
          AND e.allocation_status = 'published'
          AND e.exam_date >= date('now')
        ORDER BY e.exam_date, e.session, e.id
      `).all(studentRoll);

      return {
        student,
        examinations,
        resultsAvailable: false,
      };
    },
  };
}

module.exports = { createStudentService };
