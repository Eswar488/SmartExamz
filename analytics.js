"use strict";

(function exposeDashboardAnalytics(root) {
  function calculateDashboardAnalytics(data, filters = {}, today = new Date()) {
    const students = Array.isArray(data.students) ? data.students : [];
    const exams = Array.isArray(data.exams) ? data.exams : [];
    const rooms = Array.isArray(data.rooms) ? data.rooms : [];
    const allocations = data.allocations || {};
    const attendance = data.attendance || {};
    const studentByRoll = new Map(students.map((student) => [student.roll, student]));
    const roomById = new Map(rooms.map((room) => [room.id, room]));
    const selectedExams = exams.filter((exam) => {
      if (filters.examId && exam.id !== filters.examId) return false;
      if (filters.courseCode && exam.code !== filters.courseCode) return false;
      if (filters.department && exam.department !== filters.department) return false;
      if (filters.date && exam.date !== filters.date) return false;
      if (filters.roomId && !(allocations[exam.id]?.[filters.roomId] || []).length) return false;
      return true;
    });
    const scopedEligible = new Set();
    selectedExams.forEach((exam) => (exam.eligible || []).forEach((roll) => {
      if (studentByRoll.get(roll)?.active !== false) scopedEligible.add(roll);
    }));

    const seats = [];
    const roomBuckets = new Map();
    const departmentBuckets = new Map();
    const pending = [];
    const submitted = [];
    let unallocatedStudents = 0;

    for (const exam of selectedExams) {
      const allocatedRolls = new Set(Object.values(allocations[exam.id] || {}).flat());
      for (const roll of exam.eligible || []) {
        if (studentByRoll.get(roll)?.active !== false && !allocatedRolls.has(roll)) unallocatedStudents += 1;
      }
      for (const [roomId, rolls] of Object.entries(allocations[exam.id] || {})) {
        if (filters.roomId && roomId !== filters.roomId) continue;
        if (!Array.isArray(rolls) || rolls.length === 0) continue;
        const room = roomById.get(roomId);
        const record = attendance[exam.id]?.[roomId] || {};
        const records = record.records || {};
        const roomKey = roomId;
        const roomBucket = roomBuckets.get(roomKey) || {
          id: roomId,
          number: room?.number || roomId,
          building: room?.building || "",
          capacity: Number.isFinite(room?.capacity) ? room.capacity : 0,
          allocated: 0,
          present: 0,
          absent: 0,
          unmarked: 0,
          submittedRooms: 0,
          pendingRooms: 0,
          sessions: 0
        };
        roomBucket.sessions += 1;
        let roomHasStudents = false;
        for (const roll of rolls) {
          const student = studentByRoll.get(roll);
          roomHasStudents = true;
          const rawStatus = records[roll];
          const status = rawStatus === "present" || rawStatus === "absent" ? rawStatus : "unmarked";
          const seat = { exam, roomId, room, roll, student, status };
          seats.push(seat);
          roomBucket.allocated += 1;
          roomBucket[status] += 1;
          const department = student?.department || exam.department || "Unassigned";
          const departmentBucket = departmentBuckets.get(department) || {
            department,
            allocated: 0,
            present: 0,
            absent: 0,
            unmarked: 0
          };
          departmentBucket.allocated += 1;
          departmentBucket[status] += 1;
          departmentBuckets.set(department, departmentBucket);
        }
        if (roomHasStudents) {
          if (record.submitted === true) {
            roomBucket.submittedRooms += 1;
            submitted.push({ exam, roomId, room, record });
          } else {
            roomBucket.pendingRooms += 1;
            pending.push({ exam, roomId, room, record });
          }
        }
        roomBuckets.set(roomKey, roomBucket);
      }
    }

    const allocated = seats.length;
    const present = seats.filter((seat) => seat.status === "present").length;
    const absent = seats.filter((seat) => seat.status === "absent").length;
    const unmarked = allocated - present - absent;
    const marked = present + absent;
    const attendanceCompletion = allocated ? Math.round((marked / allocated) * 100) : 0;
    const attendanceRate = marked ? Math.round((present / marked) * 100) : 0;
    const roomSummary = [...roomBuckets.values()].map((room) => ({
      ...room,
      completionPercent: room.allocated ? Math.round(((room.present + room.absent) / room.allocated) * 100) : 0,
      attendanceRate: room.present + room.absent ? Math.round((room.present / (room.present + room.absent)) * 100) : 0
    })).sort((a, b) => a.number.localeCompare(b.number));
    const departmentSummary = [...departmentBuckets.values()].map((department) => ({
      ...department,
      completionPercent: department.allocated ? Math.round(((department.present + department.absent) / department.allocated) * 100) : 0,
      attendanceRate: department.present + department.absent ? Math.round((department.present / (department.present + department.absent)) * 100) : 0
    })).sort((a, b) => a.department.localeCompare(b.department));
    const todayString = typeof today === "string" ? today : [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0")
    ].join("-");
    const upcoming = selectedExams.filter((exam) => exam.date >= todayString).sort((a, b) => a.date.localeCompare(b.date));
    const hasExaminationScope = Boolean(filters.examId || filters.courseCode || filters.date || filters.roomId);
    const hasScope = hasExaminationScope || Boolean(filters.department);
    const scopedRoomIds = new Set(roomSummary.map((room) => room.id));
    const countedRoomIds = hasScope ? scopedRoomIds : new Set(rooms.map((room) => room.id));
    const totalCapacity = [...countedRoomIds]
      .reduce((sum, id) => sum + (Number(roomById.get(id)?.capacity) || 0), 0);
    const studentCount = hasExaminationScope
      ? scopedEligible.size
      : students.filter((student) => student.active !== false && (!filters.department || student.department === filters.department)).length;

    return {
      summary: {
        studentCount,
        examinationCount: selectedExams.length,
        roomCount: countedRoomIds.size,
        totalCapacity,
        allocated,
        unallocatedStudents,
        present,
        absent,
        unmarked,
        marked,
        attendanceCompletion,
        attendanceRate,
        pendingSubmissions: pending.length,
        submittedRooms: submitted.length,
        allocatedRooms: pending.length + submitted.length
      },
      rooms: roomSummary,
      departments: departmentSummary,
      examinations: selectedExams,
      upcoming,
      pending,
      submitted,
      seats
    };
  }

  const api = { calculateDashboardAnalytics };
  root.SmartExamzAnalytics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
