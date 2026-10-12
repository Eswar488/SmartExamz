"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateDashboardAnalytics } = require("./analytics.js");

function fixture() {
  return {
    students: [
      { roll: "A1", department: "Computer Science", active: true },
      { roll: "A2", department: "Computer Science", active: true },
      { roll: "B1", department: "Electronics", active: true },
      { roll: "U1", department: "Computer Science", active: true },
      { roll: "OFF", department: "Electronics", active: false }
    ],
    exams: [
      { id: "e1", code: "CS1", course: "Algorithms", department: "Computer Science", date: "2026-11-01", eligible: ["A1", "A2", "OFF"] },
      { id: "e2", code: "EC1", course: "Circuits", department: "Electronics", date: "2026-11-02", eligible: ["B1"] }
    ],
    rooms: [
      { id: "r1", number: "R-1", building: "North", capacity: 2 },
      { id: "r2", number: "R-2", building: "South", capacity: 2 },
      { id: "r3", number: "R-3", building: "East", capacity: 5 }
    ],
    allocations: { e1: { r1: ["A1", "A2", "OFF"] }, e2: { r2: ["B1"] } },
    attendance: {
      e1: { r1: { submitted: true, records: { A1: "present", A2: "absent", OFF: "present" } } },
      e2: { r2: { submitted: false, records: { B1: "present", UNKNOWN: "absent" } } }
    }
  };
}

test("counts active eligible students and preserves attendance for deactivated allocated students", () => {
  const result = calculateDashboardAnalytics(fixture(), {}, "2026-10-01");
  assert.equal(result.summary.studentCount, 4);
  assert.equal(result.summary.examinationCount, 2);
  assert.equal(result.summary.roomCount, 3);
  assert.equal(result.summary.totalCapacity, 9);
  assert.equal(result.summary.allocated, 4);
  assert.equal(result.summary.present, 3);
  assert.equal(result.summary.absent, 1);
  assert.equal(result.summary.unmarked, 0);
  assert.equal(result.summary.attendanceCompletion, 100);
  assert.equal(result.summary.attendanceRate, 75);
});

test("missing and invalid marks remain unmarked and lower completion", () => {
  const data = fixture();
  data.attendance.e1.r1.records.A2 = null;
  data.attendance.e2.r2.records.B1 = "late";
  const result = calculateDashboardAnalytics(data, {}, "2026-10-01");
  assert.equal(result.summary.present, 2);
  assert.equal(result.summary.absent, 0);
  assert.equal(result.summary.unmarked, 2);
  assert.equal(result.summary.marked, 2);
  assert.equal(result.summary.attendanceCompletion, 50);
  assert.equal(result.summary.attendanceRate, 100);
});

test("pending submission counts allocated rooms even when some students are marked", () => {
  const result = calculateDashboardAnalytics(fixture(), {}, "2026-10-01");
  assert.equal(result.summary.pendingSubmissions, 1);
  assert.equal(result.summary.submittedRooms, 1);
  assert.equal(result.summary.allocatedRooms, 2);
  assert.equal(result.pending[0].roomId, "r2");
});

test("department and room summaries use student departments and actual marks", () => {
  const data = fixture();
  data.attendance.e2.r2.records.B1 = undefined;
  const result = calculateDashboardAnalytics(data, {}, "2026-10-01");
  const cs = result.departments.find((department) => department.department === "Computer Science");
  const electronics = result.departments.find((department) => department.department === "Electronics");
  assert.deepEqual([cs.allocated, cs.present, cs.absent, cs.unmarked], [2, 1, 1, 0]);
  assert.deepEqual([electronics.allocated, electronics.present, electronics.absent, electronics.unmarked], [2, 1, 0, 1]);
  assert.deepEqual(result.rooms.map((room) => room.allocated), [3, 1]);
});

test("filters scope examinations, allocations, departments, dates, and rooms", () => {
  const data = fixture();
  const byDepartment = calculateDashboardAnalytics(data, { department: "Electronics" }, "2026-10-01");
  assert.equal(byDepartment.summary.examinationCount, 1);
  assert.equal(byDepartment.summary.studentCount, 1);
  assert.equal(byDepartment.summary.allocated, 1);
  const byDateRoom = calculateDashboardAnalytics(data, { date: "2026-11-01", roomId: "r1" }, "2026-10-01");
  assert.equal(byDateRoom.summary.examinationCount, 1);
  assert.equal(byDateRoom.summary.roomCount, 1);
  assert.equal(byDateRoom.summary.allocated, 3);
  assert.equal(byDateRoom.upcoming.length, 1);
  const byCourse = calculateDashboardAnalytics(data, { courseCode: "CS1" }, "2026-10-01");
  assert.equal(byCourse.summary.examinationCount, 1);
  assert.equal(byCourse.summary.studentCount, 2);
  assert.equal(byCourse.summary.allocated, 3);
});

test("directory student totals include active unallocated students and exclude deactivated students", () => {
  const data = fixture();
  const allStudents = calculateDashboardAnalytics(data, {}, "2026-10-01");
  const computerScience = calculateDashboardAnalytics(data, { department: "Computer Science" }, "2026-10-01");
  const oneExam = calculateDashboardAnalytics(data, { examId: "e1" }, "2026-10-01");
  assert.equal(allStudents.summary.studentCount, 4);
  assert.equal(computerScience.summary.studentCount, 3);
  assert.equal(oneExam.summary.studentCount, 2);
});

test("zero allocation produces zero completion and no false absentee", () => {
  const data = fixture();
  data.allocations = {};
  data.attendance = {};
  const result = calculateDashboardAnalytics(data, {}, "2026-10-01");
  assert.equal(result.summary.allocated, 0);
  assert.equal(result.summary.roomCount, 3);
  assert.equal(result.summary.totalCapacity, 9);
  assert.equal(result.summary.unallocatedStudents, 3);
  assert.equal(result.summary.attendanceCompletion, 0);
  assert.equal(result.summary.absent, 0);
  assert.equal(result.summary.pendingSubmissions, 0);
});
