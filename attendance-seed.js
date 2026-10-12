"use strict";

const studentRows = [
  ["ST24001", "Aarav Sharma", "Computer Science", "A", 2], ["ST24002", "Diya Patel", "Computer Science", "A", 2],
  ["ST24003", "Kabir Rao", "Computer Science", "A", 2], ["ST24004", "Anaya Iyer", "Computer Science", "A", 2],
  ["ST24005", "Reyansh Nair", "Computer Science", "A", 2], ["ST24006", "Myra Joshi", "Computer Science", "A", 2],
  ["ST24007", "Vivaan Shah", "Computer Science", "A", 2], ["ST24008", "Aadhya Menon", "Computer Science", "A", 2],
  ["ST24009", "Arjun Das", "Computer Science", "A", 2], ["ST24010", "Saanvi Kulkarni", "Computer Science", "A", 2],
  ["ST24011", "Ishaan Kapoor", "Computer Science", "B", 2], ["ST24012", "Kiara Reddy", "Computer Science", "B", 2],
  ["ST24013", "Advait Gupta", "Computer Science", "B", 2], ["ST24014", "Sara Thomas", "Computer Science", "B", 2],
  ["ST24015", "Vihaan Bhat", "Computer Science", "B", 2], ["ST24016", "Aanya Pillai", "Computer Science", "B", 2],
  ["ST24017", "Dhruv Sethi", "Computer Science", "B", 2], ["ST24018", "Pari Chawla", "Computer Science", "B", 2],
  ["ST24019", "Rohan Verma", "Electronics", "A", 2], ["ST24020", "Ira Fernandes", "Electronics", "A", 2],
  ["ST24021", "Atharv Sen", "Electronics", "A", 2], ["ST24022", "Nisha Krishnan", "Electronics", "A", 2],
  ["ST24023", "Dev Malhotra", "Electronics", "A", 2], ["ST24024", "Tara Bose", "Electronics", "A", 2],
  ["ST24025", "Kian Dutta", "Electronics", "A", 2], ["ST24026", "Meera Sood", "Electronics", "A", 2],
  ["ST24027", "Omkar Patil", "Electronics", "B", 2], ["ST24028", "Zara Ali", "Electronics", "B", 2],
  ["ST24029", "Yash Khandelwal", "Electronics", "B", 2], ["ST24030", "Riya Banerjee", "Electronics", "B", 2]
];
const roomRows = [
  ["room-101", "A-101", "A Block", 40], ["room-102", "A-203", "A Block", 50],
  ["room-103", "B-105", "B Block", 60], ["room-104", "B-210", "B Block", 35],
  ["room-105", "C-012", "C Block", 45]
];

function seedAttendanceDatabase(db) {
  const hasExaminations = db.prepare("SELECT COUNT(*) AS count FROM examinations").get().count > 0;
  if (hasExaminations) {
    const capacities = new Map(roomRows.map(([id, , , capacity]) => [id, capacity]));
    for (const [roomId, capacity] of capacities) {
      db.prepare("UPDATE rooms SET capacity = ? WHERE id = ? AND capacity = 1").run(capacity, roomId);
    }
    for (const [roll, , , , year] of studentRows) {
      db.prepare("UPDATE students SET year = ? WHERE roll = ? AND year = 1").run(year, roll);
    }
    const cohorts = [
      ["exam-1", "Computer Science", 2, "A"],
      ["exam-2", "Electronics", 2, "A"],
      ["exam-3", "Computer Science", 2, "B"]
    ];
    for (const [examId, department, year, section] of cohorts) {
      if (!db.prepare("SELECT 1 FROM examinations WHERE id = ?").get(examId)) continue;
      db.prepare(`
        UPDATE examinations SET department = ?, year = ?, section = ?,
          allocation_status = CASE WHEN ? = 'exam-3' THEN 'draft' ELSE 'published' END
        WHERE id = ? AND department = ''
      `).run(department, year, section, examId, examId);
      db.prepare(`
        INSERT OR IGNORE INTO exam_eligibility (exam_id, student_roll)
        SELECT ?, roll FROM students WHERE department = ? AND section = ? AND year = ?
      `).run(examId, department, section, year);
    }
    return;
  }
  const shiftDate = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
  };
  const students = studentRows.map(([roll, name, department, section, year]) => ({ roll, name, department, section, year }));
  const studentsByCohort = (department, section, year) => students.filter((student) => student.department === department && student.section === section && student.year === year);
  const exams = [
    { id: "exam-1", name: "Mid-Semester Examination", code: "CS204", course: "Data Structures", examDate: shiftDate(2), session: "Morning", department: "Computer Science", year: 2, section: "A", published: true, students: studentsByCohort("Computer Science", "A", 2), roomId: "room-101", invigilatorId: "staff-1" },
    { id: "exam-2", name: "Mid-Semester Examination", code: "EC202", course: "Digital Electronics", examDate: shiftDate(2), session: "Afternoon", department: "Electronics", year: 2, section: "A", published: true, students: studentsByCohort("Electronics", "A", 2), roomId: "room-102", invigilatorId: "staff-1" },
    { id: "exam-3", name: "Class Test II", code: "CS206", course: "Database Systems", examDate: shiftDate(5), session: "Morning", department: "Computer Science", year: 2, section: "B", published: false, students: studentsByCohort("Computer Science", "B", 2), roomId: "room-103", invigilatorId: "staff-2" }
  ];
  db.exec("BEGIN");
  try {
    const insertStudent = db.prepare("INSERT INTO students (roll, name, department, section, year) VALUES (?, ?, ?, ?, ?)");
    studentRows.forEach((student) => insertStudent.run(...student));
    const insertRoom = db.prepare("INSERT INTO rooms (id, number, building, capacity) VALUES (?, ?, ?, ?)");
    roomRows.forEach((room) => insertRoom.run(...room));
    const insertExam = db.prepare(`
      INSERT INTO examinations
        (id, name, code, course, exam_date, session, department, year, section, allocation_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertAssignment = db.prepare(`
      INSERT INTO room_assignments (exam_id, room_id, invigilator_id) VALUES (?, ?, ?)
    `);
    const insertAllocation = db.prepare(`
      INSERT INTO allocations (exam_id, room_id, student_roll, seat_number) VALUES (?, ?, ?, ?)
    `);
    const insertSession = db.prepare(`
      INSERT INTO attendance_sessions (exam_id, room_id, submitted_at, submitted_by) VALUES (?, ?, ?, ?)
    `);
    const insertRecord = db.prepare(`
      INSERT INTO attendance_records (exam_id, room_id, student_roll, status, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    exams.forEach((exam) => {
    insertExam.run(exam.id, exam.name, exam.code, exam.course, exam.examDate, exam.session,
      exam.department, exam.year, exam.section, exam.published ? "published" : "draft");
    const insertEligible = db.prepare("INSERT INTO exam_eligibility (exam_id, student_roll) VALUES (?, ?)");
    exam.students.forEach((student) => insertEligible.run(exam.id, student.roll));
      insertAssignment.run(exam.id, exam.roomId, exam.invigilatorId);
      exam.students.forEach((student, index) => insertAllocation.run(exam.id, exam.roomId, student.roll, index + 1));
      const submitted = exam.id !== "exam-3";
      insertSession.run(exam.id, exam.roomId, submitted ? now : null, submitted ? exam.invigilatorId : null);
      exam.students.forEach((student, index) => {
        const status = exam.id === "exam-3"
          ? index < 3 ? index === 1 ? "absent" : "present" : "unmarked"
          : exam.id === "exam-1"
            ? index === 8 ? "absent" : "present"
            : index === 2 || index === 7 ? "absent" : "present";
        if (status !== "unmarked") {
          insertRecord.run(exam.id, exam.roomId, student.roll, status, now, exam.invigilatorId);
        }
      });
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

module.exports = { seedAttendanceDatabase };
