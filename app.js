"use strict";

const STORAGE_KEY = "smartexamz-state-v1";
const today = new Date();
const dateOffset = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const studentsSeed = [
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
].map(([roll, name, department, section, year]) => ({ roll, name, department, section, year, active: true }));

function makeSeed() {
  const students = structuredClone(studentsSeed);
  const ago = (days, time) => `${dateOffset(-days)}T${time}:00`;
  const groups = {
    csa: students.filter((s) => s.department === "Computer Science" && s.section === "A").map((s) => s.roll),
    csb: students.filter((s) => s.department === "Computer Science" && s.section === "B").map((s) => s.roll),
    eca: students.filter((s) => s.department === "Electronics" && s.section === "A").map((s) => s.roll)
  };
  return {
    role: "admin",
    selectedIncharge: "staff-1",
    students,
    staff: [{ id: "staff-1", name: "Meera Krishnan", initials: "MK" }, { id: "staff-2", name: "Arjun Nambiar", initials: "AN" }],
    rooms: [
      { id: "room-101", number: "A-101", building: "A Block", capacity: 40, available: true },
      { id: "room-102", number: "A-203", building: "A Block", capacity: 50, available: true },
      { id: "room-103", number: "B-105", building: "B Block", capacity: 60, available: true },
      { id: "room-104", number: "B-210", building: "B Block", capacity: 35, available: true },
      { id: "room-105", number: "C-012", building: "C Block", capacity: 45, available: true }
    ],
    exams: [
      { id: "exam-1", name: "Mid-Semester Examination", code: "CS204", course: "Data Structures", date: dateOffset(2), session: "Morning", department: "Computer Science", year: 2, section: "A", eligible: groups.csa, published: true, assignments: [{ roomId: "room-101", inchargeId: "staff-1" }] },
      { id: "exam-2", name: "Mid-Semester Examination", code: "EC202", course: "Digital Electronics", date: dateOffset(2), session: "Afternoon", department: "Electronics", year: 2, section: "A", eligible: groups.eca, published: true, assignments: [{ roomId: "room-102", inchargeId: "staff-1" }] },
      { id: "exam-3", name: "Class Test II", code: "CS206", course: "Database Systems", date: dateOffset(5), session: "Morning", department: "Computer Science", year: 2, section: "B", eligible: groups.csb, published: false, assignments: [{ roomId: "room-103", inchargeId: "staff-2" }] }
    ],
    allocations: {
      "exam-1": { "room-101": groups.csa },
      "exam-2": { "room-102": groups.eca },
      "exam-3": { "room-103": groups.csb }
    },
    attendance: {
      "exam-1": { "room-101": { submitted: true, submittedBy: "staff-1", records: Object.fromEntries(groups.csa.map((roll, i) => [roll, i === 8 ? "absent" : "present"])) } },
      "exam-2": { "room-102": { submitted: true, submittedBy: "staff-1", records: Object.fromEntries(groups.eca.map((roll, i) => [roll, i === 2 || i === 7 ? "absent" : "present"])) } },
      "exam-3": { "room-103": { submitted: false, submittedBy: null, records: Object.fromEntries(groups.csb.slice(0, 3).map((roll, i) => [roll, i === 1 ? "absent" : "present"])) } }
    },
    activity: [
      { id: "activity-seed-1", type: "exam_created", summary: "Created examination: Data Structures (CS204)", examId: "exam-1", actor: "Ananya Mehta", at: ago(4, "10:20") },
      { id: "activity-seed-2", type: "exam_created", summary: "Created examination: Digital Electronics (EC202)", examId: "exam-2", actor: "Ananya Mehta", at: ago(3, "09:45") },
      { id: "activity-seed-3", type: "attendance_submitted", summary: "Submitted attendance for A-101 · CS204", examId: "exam-1", roomId: "room-101", actor: "Meera Krishnan", at: ago(1, "15:25") },
      { id: "activity-seed-4", type: "allocation_published", summary: "Published student seating for CS204", examId: "exam-1", actor: "Ananya Mehta", at: ago(1, "14:40") },
      { id: "activity-seed-5", type: "attendance_submitted", summary: "Submitted attendance for A-203 · EC202", examId: "exam-2", roomId: "room-102", actor: "Meera Krishnan", at: ago(0, "11:15") },
      { id: "activity-seed-6", type: "exam_created", summary: "Created examination: Database Systems (CS206)", examId: "exam-3", actor: "Ananya Mehta", at: ago(0, "09:10") }
    ],
    ui: { page: "overview", selectedExam: "exam-3", selectedRoom: "room-103", reportTab: "absentees", sidebarCollapsed: false, mobileSidebarOpen: false, selectedAttendance: [], dashboardFilters: {} }
  };
}

let state;
let initialLoadError = false;
let isAuthenticated = false;
let loginRole = "admin";
let loginPending = false;
let loginErrorMessage = "";
let loginUserId = "";
let rememberUserId = false;
let authenticatedRole = "";
let storedState = null;
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  storedState = stored ? JSON.parse(stored) : null;
  state = storedState ? { ...makeSeed(), ...storedState } : makeSeed();
} catch (error) {
  console.error("Unable to load saved examination data.", error);
  state = makeSeed();
  initialLoadError = true;
}
try {
  loginUserId = localStorage.getItem("smartexamz-login-user-id") || "";
  rememberUserId = Boolean(loginUserId);
} catch (error) {
  console.warn("Could not load the remembered login ID.", error);
}
if (storedState && !Array.isArray(storedState.activity)) state.activity = [];
state.activity ||= [];
state.ui.dashboardFilters ||= {};
state.attendance = {};
if (state.role === "incharge") state.role = "admin";
let pendingAllocation = null;
let pendingAdminAction = null;
let pendingBulkAttendance = null;
let modalReturnFocus = null;
let attendanceToken = null;
let adminToken = null;
let studentToken = null;
let studentDashboard = { status: "idle", data: null, error: "" };
let studentRosterState = { status: "idle", students: [], error: "" };
let attendanceLoadingKey = "";
let attendanceLoadError = "";
let attendanceLoadErrorKey = "";
let attendanceMutationError = "";
let attendanceSubmissionBusy = false;
const attendanceContexts = new Map();
const pendingAttendanceChanges = new Map();
const seatingRosterCache = new Map();

const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const save = () => {
  const persistentState = { ...state };
  delete persistentState.attendance;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentState)); }
  catch (error) { console.error("Unable to save examination data.", error); toast("Could not save changes in this browser.", true); }
};
const dateLabel = (value, options = { day: "numeric", month: "short", year: "numeric" }) => new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", options);
const examById = (id) => state.exams.find((exam) => exam.id === id);
const roomById = (id) => state.rooms.find((room) => room.id === id);
const staffById = (id) => state.staff.find((member) => member.id === id);
const studentByRoll = (roll) => state.students.find((student) => student.roll === roll);
const allocatedToExam = (examId) => Object.values(state.allocations[examId] || {}).flat();
const roomCountFor = (examId, roomId) => (state.allocations[examId]?.[roomId] || []).length;
const roomAttendance = (examId, roomId) => state.attendance[examId]?.[roomId] || { submitted: false, submittedBy: null, records: {} };
const roomBookedForSession = (roomId, exam) => state.exams.some((other) => other.id !== exam.id && other.date === exam.date && other.session === exam.session && roomCountFor(other.id, roomId) > 0);
const statusBadge = (label, color) => `<span class="badge ${color}">${esc(label)}</span>`;
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const attendanceKey = (examId, roomId) => `${examId}:${roomId}`;
function applyAttendancePayload(payload) {
  const { exam_id: examId, room_id: roomId, submitted_at: submittedAt, submitted_by: submittedBy } = payload.exam;
  const record = {
    submitted: Boolean(submittedAt),
    submittedBy: submittedBy || null,
    submittedAt: submittedAt || null,
    records: Object.fromEntries(payload.students.map((student) => [student.roll, student.status]))
  };
  state.attendance[examId] ||= {};
  state.attendance[examId][roomId] = record;
  attendanceContexts.set(attendanceKey(examId, roomId), payload);
}
function loadAttendanceRoom(examId, roomId) {
  const key = attendanceKey(examId, roomId);
  if (!attendanceToken || !examId || !roomId || attendanceContexts.has(key) || attendanceLoadingKey === key || attendanceLoadErrorKey === key) return;
  attendanceLoadingKey = key;
  attendanceLoadError = "";
  attendanceLoadErrorKey = "";
  render();
  SmartExamzAttendanceApi.getRoom(examId, roomId, attendanceToken).then((payload) => {
    applyAttendancePayload(payload);
    if (attendanceLoadingKey === key) attendanceLoadingKey = "";
    if (state.ui.page === "attendance" && attendanceKey(state.ui.selectedExam, state.ui.selectedRoom) === key) render();
  }).catch((error) => {
    if (attendanceLoadingKey === key) attendanceLoadingKey = "";
    if (handleSessionFailure(error)) return;
    attendanceLoadError = error.message;
    attendanceLoadErrorKey = key;
    if (state.ui.page === "attendance" && attendanceKey(state.ui.selectedExam, state.ui.selectedRoom) === key) render();
  });
}
async function queueAttendanceChange(examId, roomId, studentRoll, status) {
  const key = `${attendanceKey(examId, roomId)}:${studentRoll}`;
  const changes = state.attendance[examId]?.[roomId]?.records;
  if (!changes || !["present", "absent", "unmarked"].includes(status)) {
    toast("Choose Present, Absent, or Unmarked for an allocated student.", true);
    return false;
  }
  changes[studentRoll] = status;
  pendingAttendanceChanges.set(key, { examId, roomId, studentRoll, status });
  attendanceMutationError = "";
  render();
  try {
    const payload = await SmartExamzAttendanceApi.updateStatus({ examId, roomId, studentRoll, status, token: attendanceToken });
    applyAttendancePayload(payload);
    pendingAttendanceChanges.delete(key);
    attendanceMutationError = "";
    recordActivity("attendance_updated", `Marked ${studentRoll} ${status} for ${examById(examId)?.code || examId}`, { examId, roomId });
    save();
    render();
    const select = $(`[data-attendance-roll="${CSS.escape(studentRoll)}"]`);
    select?.focus();
    return true;
  } catch (error) {
    if (handleSessionFailure(error)) return false;
    attendanceMutationError = error.message;
    render();
    toast(error.message, true);
    return false;
  }
}
async function retryAttendanceChanges() {
  if (!attendanceToken || !pendingAttendanceChanges.size) return;
  attendanceMutationError = "";
  for (const [key, change] of pendingAttendanceChanges) {
    try {
      const payload = await SmartExamzAttendanceApi.updateStatus({ ...change, token: attendanceToken });
      applyAttendancePayload(payload);
      pendingAttendanceChanges.delete(key);
      recordActivity("attendance_updated", `Marked ${change.studentRoll} ${change.status} for ${examById(change.examId)?.code || change.examId}`, { examId: change.examId, roomId: change.roomId });
    } catch (error) {
      attendanceMutationError = error.message;
      if (handleSessionFailure(error)) break;
      toast(`Attendance retry failed: ${error.message}`, true);
      break;
    }
  }
  render();
}
function recordActivity(type, summary, details = {}) {
  const actor = state.role === "incharge" ? staffById(state.selectedIncharge)?.name : state.role === "student" ? studentDashboard.data?.student?.name : "Ananya Mehta";
  state.activity.unshift({ id: `activity-${crypto.randomUUID()}`, type, summary, actor: actor || "System", at: new Date().toISOString(), ...details });
  state.activity = state.activity.slice(0, 100);
}

function toast(message, error = false) {
  const node = document.createElement("div");
  node.className = `toast${error ? " error" : ""}`;
  node.setAttribute("role", error ? "alert" : "status");
  node.textContent = message;
  $("#toastRegion").append(node);
  setTimeout(() => node.remove(), 3200);
}

const loginRoleDetails = {
  admin: {
    title: "Admin",
    description: "Manage the examination system",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5.2-3.4 8.4-8 10-4.6-1.6-8-4.8-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>`
  },
  student: {
    title: "Student",
    description: "Access your examination information",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3.7 3 8.3 3 12 0v-5M22 9v6"/></svg>`
  },
  incharge: {
    title: "In-Charge",
    description: "Manage assigned examination rooms",
    icon: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3"/></svg>`
  }
};

function renderLogin() {
  const root = $("#loginRoot");
  root.innerHTML = `<main class="login-layout" id="loginMain" tabindex="-1">
    <section class="login-brand-panel" aria-label="SmartExamz">
      <div class="login-brand">
        <span class="login-brand-mark" aria-hidden="true">S</span>
        <span><strong>SmartExamz</strong><small>Examination Management System</small></span>
      </div>
      <div class="login-brand-copy">
        <span class="login-eyebrow">SECURE ACCESS PORTAL</span>
        <h1>Your examination operations,<br>all in one place.</h1>
        <p>A trusted workspace for examination administration, room operations, and student schedules.</p>
      </div>
      <div class="login-brand-footer"><span class="login-shield" aria-hidden="true">✓</span><span>Secure access for your university community</span></div>
      <div class="login-decoration login-decoration-one" aria-hidden="true"></div>
      <div class="login-decoration login-decoration-two" aria-hidden="true"></div>
    </section>
    <section class="login-form-panel">
      <div class="login-card">
        <div class="login-mobile-brand">
          <span class="login-brand-mark" aria-hidden="true">S</span>
          <span><strong>SmartExamz</strong><small>Examination Management System</small></span>
        </div>
        <span class="login-eyebrow login-eyebrow-light">SECURE ACCESS PORTAL</span>
        <h2>Welcome Back</h2>
        <p class="login-intro">Sign in to access your examination portal.</p>
        <form id="portalLoginForm">
          <fieldset class="login-role-fieldset">
            <legend>Select your role</legend>
            <div class="login-role-grid" role="radiogroup" aria-label="Select your role">
              ${Object.entries(loginRoleDetails).map(([role, details]) => `<label class="login-role-card ${loginRole === role ? "selected" : ""}" for="loginRole-${role}">
                <input id="loginRole-${role}" type="radio" name="role" value="${role}" ${loginRole === role ? "checked" : ""}>
                <span class="login-role-icon">${details.icon}</span>
                <span class="login-role-name">${details.title}</span>
                <span class="login-role-description">${details.description}</span>
              </label>`).join("")}
            </div>
          </fieldset>
          <div class="login-field">
            <label for="loginUserId">${loginRole === "student" ? "Student ID or Email" : "User ID or Email"}</label>
            <div class="login-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-3.5 2.8-5.5 7-5.5s6.5 2 7 5.5"/></svg><input id="loginUserId" name="userId" type="text" autocomplete="username" placeholder="${loginRole === "student" ? "Enter your student ID or email" : "Enter your user ID or email"}" maxlength="254" value="${esc(loginUserId)}" aria-describedby="loginError" required></div>
          </div>
          <div class="login-field">
            <div class="login-label-row"><label for="loginPassword">Password</label><button class="login-text-button" type="button" data-action="forgot-password">Forgot password?</button></div>
            <div class="login-input-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg><input id="loginPassword" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" aria-describedby="loginError" required><button class="password-toggle" type="button" data-action="toggle-password" aria-label="Show password" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/></svg></button></div>
          </div>
          <div class="login-options"><label class="remember-option"><input type="checkbox" id="rememberUserId"><span>Remember my user ID</span></label><span class="login-password-note">Your password is never saved here</span></div>
          <p class="login-error" id="loginError" role="alert" ${loginErrorMessage ? "" : "hidden"}>${esc(loginErrorMessage)}</p>
          <button class="login-submit" type="submit" ${loginPending ? "disabled aria-busy='true'" : ""}>${loginPending ? `<span class="loading-spinner" aria-hidden="true"></span> Signing in…` : "Sign In"}</button>
          <p class="login-support">Need help accessing your account? <span>Contact your examination office.</span></p>
        </form>
      </div>
      <div class="login-legal">SmartExamz · Examination Management System</div>
    </section>
  </main>`;
  const remember = $("#rememberUserId");
  if (remember) remember.checked = rememberUserId;
}

function expireAuthenticatedSession(message) {
  loginRole = authenticatedRole || state.role;
  isAuthenticated = false;
  attendanceToken = null;
  adminToken = null;
  studentToken = null;
  authenticatedRole = "";
  studentDashboard = { status: "idle", data: null, error: "" };
  studentRosterState = { status: "idle", students: [], error: "" };
  attendanceContexts.clear();
  loginErrorMessage = message || "Your session has expired. Sign in again to continue.";
  render();
}

function handleSessionFailure(error) {
  if (error.status !== 401 || !isAuthenticated) return false;
  expireAuthenticatedSession();
  return true;
}

async function authenticatePortalUser(form) {
  if (loginPending) return;
  const formData = new FormData(form);
  loginRole = String(formData.get("role") || "");
  const userId = String(formData.get("userId") || "").trim();
  const password = String(formData.get("password") || "");
  rememberUserId = formData.get("rememberUserId") === "on";
  loginUserId = userId;
  const validationMessage = SmartExamzLoginUtils.validateLoginForm(loginRole, userId, password);
  if (validationMessage) {
    loginErrorMessage = validationMessage;
  } else {
    loginErrorMessage = "";
    loginPending = true;
    renderLogin();
    try {
      const session = loginRole === "admin"
        ? await SmartExamzSeatingApi.login({ userId, password })
        : loginRole === "student"
          ? await SmartExamzStudentApi.login({ userId, password })
          : await SmartExamzAttendanceApi.login({ invigilatorId: userId, password });
      if (!session?.token) throw new Error("The server did not establish an authenticated session.");
      if (session.role !== loginRole) throw new Error("The server returned a session for a different role.");
      if (loginRole === "admin") adminToken = session.token;
      else if (loginRole === "student") {
        studentToken = session.token;
        studentDashboard = { status: "idle", data: null, error: "" };
      } else {
        attendanceToken = session.token;
        state.selectedIncharge = session.invigilatorId;
        attendanceContexts.clear();
      }
      authenticatedRole = session.role;
      studentRosterState = { status: "idle", students: [], error: "" };
      state.role = loginRole;
      state.ui.page = loginRole === "student" ? "schedule" : pendingAttendanceChanges.size && loginRole === "incharge" ? "attendance" : "overview";
      try {
        if (rememberUserId) localStorage.setItem("smartexamz-login-user-id", userId);
        else localStorage.removeItem("smartexamz-login-user-id");
      } catch (error) {
        console.warn("Could not update the remembered login ID.", error);
      }
      loginUserId = rememberUserId ? userId : "";
      isAuthenticated = true;
      loginErrorMessage = "";
      loginPending = false;
      render();
      toast(`Signed in as ${loginRoleDetails[loginRole].title}.`);
      if (pendingAttendanceChanges.size && loginRole === "incharge") retryAttendanceChanges();
      return;
    } catch (error) {
      loginPending = false;
      loginErrorMessage = error.status === 401
        ? "The credentials were not accepted. Check your user ID and password."
        : error.message || "Sign-in could not be completed. Try again.";
      renderLogin();
      $("#loginPassword")?.focus();
      return;
    }
  }
  renderLogin();
  if (loginRole === "student") $("#loginError")?.focus();
}

const navItems = {
  admin: [
    { group: "Workspace", items: [["overview", "◫", "Dashboard"], ["exams", "▤", "Examinations"], ["students", "♙", "Students"], ["rooms", "⌂", "Room Management"], ["allocations", "▦", "Seating Plan"], ["attendance", "✓", "Attendance"], ["reports", "▥", "Reports"]] },
    { group: "Administration", items: [["users", "♧", "User Management"], ["settings", "⚙", "Settings"]] }
  ],
  incharge: [{ group: "Workspace", items: [["overview", "◫", "Dashboard"], ["attendance", "✓", "Attendance"]] }],
  student: [["schedule", "▤", "My schedule"]]
};
const pageNames = { overview: "Dashboard", exams: "Examinations", rooms: "Room Management", students: "Students", allocations: "Seating Plan", attendance: "Attendance", reports: "Reports", users: "User Management", settings: "Settings", schedule: "My schedule" };

function renderNav() {
  const groups = navItems[state.role] || navItems.admin;
  const items = Array.isArray(groups[0]) ? [{ group: "Workspace", items: groups }] : groups;
  if (!items.some((group) => group.items.some(([id]) => id === state.ui.page))) state.ui.page = items[0].items[0][0];
  $("#sideNav").innerHTML = items.map((group) => `<div class="nav-group"><div class="nav-group-label">${group.group}</div>${group.items.map(([id, icon, label]) => `<button class="nav-link ${state.ui.page === id ? "active" : ""}" data-page="${id}" aria-current="${state.ui.page === id ? "page" : "false"}" aria-label="${label}" title="${label}"><span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span>${id === "attendance" && pendingRoomsCount() ? `<span class="nav-count">${pendingRoomsCount()}</span>` : ""}</button>`).join("")}</div>`).join("");
  const narrowNav = window.matchMedia("(max-width: 900px)").matches;
  $("#appSidebar").classList.toggle("collapsed", !narrowNav && Boolean(state.ui.sidebarCollapsed));
  $("#appSidebar").classList.toggle("mobile-expanded", narrowNav && Boolean(state.ui.mobileSidebarOpen));
  $("#sidebarBackdrop").hidden = !(narrowNav && state.ui.mobileSidebarOpen);
  $("#sidebarToggle").setAttribute("aria-expanded", String(narrowNav ? Boolean(state.ui.mobileSidebarOpen) : !state.ui.sidebarCollapsed));
  $("#sidebarToggle").setAttribute("aria-label", narrowNav ? state.ui.mobileSidebarOpen ? "Close navigation" : "Expand navigation" : state.ui.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar");
  $("#breadcrumbCurrent").textContent = pageNames[state.ui.page];
  const identity = state.role === "admin" ? { name: "Ananya Mehta", title: "Examination Admin" } : state.role === "incharge" ? { name: staffById(state.selectedIncharge)?.name || "Meera Krishnan", title: "Examination In-Charge" }   : { name: studentDashboard.data?.student?.name || "Student", title: "Student" };
  $("#profileName").textContent = identity.name;
  $("#profileRole").textContent = identity.title;
  $("#profileAvatar").textContent = initials(identity.name);
  $("#sessionRoleLabel").textContent = identity.title;
  $(".top-avatar").textContent = initials(identity.name);
}
function pendingRoomsCount() {
  return state.exams.reduce((sum, exam) => sum + Object.keys(state.allocations[exam.id] || {}).filter((roomId) => roomCountFor(exam.id, roomId) && !roomAttendance(exam.id, roomId).submitted).length, 0);
}
function pageHeading(title, subtitle, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function dashboardFilters() { return state.ui.dashboardFilters || {}; }
function dashboardMetrics() {
  return SmartExamzAnalytics.calculateDashboardAnalytics(state, dashboardFilters());
}
function dashboardFilterControls(filters) {
  return `<div class="filter-bar">
      <select class="filter-control" id="dashboardExamFilter" aria-label="Filter dashboard by examination"><option value="">All examinations</option>${state.exams.map((exam) => `<option value="${esc(exam.id)}" ${filters.examId === exam.id ? "selected" : ""}>${esc(exam.name)} · ${esc(exam.date)}</option>`).join("")}</select>
      <select class="filter-control" id="dashboardCourseFilter" aria-label="Filter dashboard by course"><option value="">All courses</option>${[...new Map(state.exams.map((exam) => [exam.code, exam])).values()].map((exam) => `<option value="${esc(exam.code)}" ${filters.courseCode === exam.code ? "selected" : ""}>${esc(exam.code)} · ${esc(exam.course)}</option>`).join("")}</select>
      <select class="filter-control" id="dashboardDeptFilter" aria-label="Filter dashboard by department"><option value="">All departments</option>${departments().map((dep) => `<option value="${esc(dep)}" ${filters.department === dep ? "selected" : ""}>${esc(dep)}</option>`).join("")}</select>
      <label class="dashboard-date-filter"><span class="sr-only">Filter by examination date</span><input class="filter-control" id="dashboardDateFilter" type="date" aria-label="Filter by examination date" value="${esc(filters.date || "")}"></label>
      <select class="filter-control" id="dashboardRoomFilter" aria-label="Filter dashboard by room"><option value="">All rooms</option>${state.rooms.map((room) => `<option value="${esc(room.id)}" ${filters.roomId === room.id ? "selected" : ""}>${esc(room.number)}</option>`).join("")}</select>
      <button class="button small" type="button" data-action="clear-dashboard-filters" ${Object.values(filters).some(Boolean) ? "" : "disabled"}>Clear filters</button>
    </div>`;
}
function dashboardRoomChart(metrics) {
  if (!metrics.rooms.length) return emptyState("No room attendance data", "Allocated room attendance summaries will appear here.");
  return `<div class="room-chart-list">${metrics.rooms.map((room) => {
    const fill = room.allocated ? Math.round((room.present / room.allocated) * 100) : 0;
    return `<div class="room-chart-row"><div class="room-chart-label"><strong>${esc(room.number)}</strong><span>${esc(room.building || "Building not set")} · ${room.allocated} allocated</span><small>${room.present} present · ${room.absent} absent · ${room.unmarked} unmarked</small></div><div class="room-chart-track" role="img" aria-label="${esc(room.number)}: ${room.present} present, ${room.absent} absent, ${room.unmarked} unmarked"><span class="chart-present" style="width:${fill}%"></span><span class="chart-absent" style="width:${room.allocated ? Math.round(room.absent / room.allocated * 100) : 0}%"></span><span class="chart-unmarked" style="width:${room.allocated ? Math.round(room.unmarked / room.allocated * 100) : 0}%"></span></div><span class="room-chart-count">${room.completionPercent}% marked</span></div>`;
  }).join("")}</div><div class="chart-legend"><span><i class="legend-present"></i>Present</span><span><i class="legend-absent"></i>Absent</span><span><i class="legend-unmarked"></i>Unmarked</span></div>`;
}
function dashboardDepartmentChart(metrics) {
  if (!metrics.departments.length) return emptyState("No department attendance data", "Department summaries will appear when students are allocated.");
  const width = 420;
  const max = Math.max(...metrics.departments.map((department) => department.allocated), 1);
  const rowHeight = 58;
  const height = metrics.departments.length * rowHeight + 12;
  const bars = metrics.departments.map((department, index) => {
    const y = 8 + index * rowHeight;
    const scale = width / max;
    const presentWidth = department.present * scale;
    const absentWidth = department.absent * scale;
    const unmarkedWidth = department.unmarked * scale;
    return `<text x="0" y="${y + 22}" class="department-chart-label">${esc(department.department)}</text><rect x="150" y="${y + 7}" width="${presentWidth}" height="22" rx="5" class="chart-present"></rect><rect x="${150 + presentWidth}" y="${y + 7}" width="${absentWidth}" height="22" class="chart-absent"></rect><rect x="${150 + presentWidth + absentWidth}" y="${y + 7}" width="${unmarkedWidth}" height="22" rx="5" class="chart-unmarked"></rect><text x="150" y="${y + 47}" class="department-chart-count">${department.present} present · ${department.absent} absent · ${department.unmarked} unmarked</text>`;
  }).join("");
  const description = metrics.departments.map((department) => `${department.department}: ${department.present} present, ${department.absent} absent, ${department.unmarked} unmarked`).join("; ");
  return `<div class="department-chart-scroll"><svg viewBox="0 0 590 ${height}" role="img" aria-labelledby="departmentChartTitle departmentChartDescription"><title id="departmentChartTitle">Attendance by department</title><desc id="departmentChartDescription">${esc(description)}</desc>${bars}</svg></div><div class="chart-legend"><span><i class="legend-present"></i>Present</span><span><i class="legend-absent"></i>Absent</span><span><i class="legend-unmarked"></i>Unmarked</span></div>`;
}
function dashboardActivity(metrics) {
  const examIds = new Set(metrics.examinations.map((exam) => exam.id));
  const roomId = dashboardFilters().roomId;
  const events = state.activity.filter((event) => {
    if (!event || typeof event.at !== "string" || !Number.isFinite(new Date(event.at).getTime())) return false;
    if (event.examId && !examIds.has(event.examId)) return false;
    if ((dashboardFilters().examId || dashboardFilters().courseCode || dashboardFilters().department) && !event.examId) return false;
    if (roomId && event.roomId && event.roomId !== roomId) return false;
    if (roomId && !event.roomId && !event.examId) return false;
    if (roomId && event.type === "attendance_submitted" && !event.roomId) return false;
    if (!event.examId && dashboardFilters().date && event.at.slice(0, 10) !== dashboardFilters().date) return false;
    return true;
  }).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
  if (!events.length) return emptyState("No recent activity", "Examination changes and attendance submissions will appear here.");
  return `<div class="activity-list">${events.map((event) => `<div class="activity-item"><div class="activity-icon" aria-hidden="true">${event.type === "attendance_submitted" ? "✓" : event.type === "exam_created" ? "▤" : "◷"}</div><div class="activity-copy"><strong>${esc(event.summary)}</strong><span class="activity-detail">By ${esc(event.actor)}</span></div><time class="activity-time" datetime="${esc(event.at)}">${new Date(event.at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time></div>`).join("")}</div>`;
}
function dashboardUpcoming(metrics) {
  const exams = metrics.upcoming.slice(0, 5);
  if (!exams.length) return `<tr><td colspan="4">${emptyState("No upcoming examinations", "No scheduled examinations match these filters.")}</td></tr>`;
  return exams.map((exam) => {
    const count = new Set(allocatedToExam(exam.id)).size;
    return `<tr><td><div class="exam-row-title">${esc(exam.course)}</div><div class="exam-row-meta">${esc(exam.code)} · ${esc(exam.department)}</div></td><td>${dateLabel(exam.date, { day: "numeric", month: "short" })}<div class="table-secondary">${esc(exam.session)}</div></td><td>${count} / ${exam.eligible.length}</td><td>${exam.published ? statusBadge("Published", "green") : statusBadge("Draft", "amber")}</td></tr>`;
  }).join("");
}
function renderOverview() {
  if (state.role === "student") return renderSchedule();
  if (state.role === "incharge") return renderInchargeOverview();
  let metrics;
  try {
    metrics = dashboardMetrics();
  } catch (error) {
    console.error("Unable to calculate dashboard analytics.", error);
    return `${pageHeading("Examination dashboard", "Analytics are temporarily unavailable.")}<div class="dashboard-error" role="alert">Dashboard data could not be calculated. Refresh the page to try again.</div>`;
  }
  const summary = metrics.summary;
  const filters = dashboardFilters();
  return `${pageHeading("Good morning, Ananya", "Here’s what’s happening across your examination section today.", `<button class="button" data-action="print-dashboard">⇩&nbsp; Export</button><button class="button primary" data-action="add-exam">＋&nbsp; Create examination</button>`)}
    <div class="stats-grid">
      ${statCard("Students", summary.studentCount, "♙", `${filters.examId || filters.courseCode || filters.date || filters.roomId ? "Eligible in selected examinations" : "Active student records"} · ${summary.unallocatedStudents} awaiting allocation`, "students")}
      ${statCard("Examinations", summary.examinationCount, "▤", "Matching selected filters", "exams")}
      ${statCard("Rooms", summary.roomCount, "⌂", `${summary.totalCapacity} total seats · ${summary.allocated} allocated`, "rooms")}
      ${statCard("Attendance completion", `${summary.attendanceCompletion}%`, "◷", `${summary.marked} of ${summary.allocated} records marked`, "completion")}
      ${statCard("Present students", summary.present, "✓", `${summary.attendanceRate}% of marked attendance`, "present")}
      ${statCard("Absent students", summary.absent, "×", "Explicitly marked absent", "absent")}
      ${statCard("Unmarked students", summary.unmarked, "◷", "Not counted as absent", "unmarked")}
      ${statCard("Pending submissions", summary.pendingSubmissions, "↗", "Allocated rooms awaiting submission", "pending")}
    </div>
    ${dashboardFilterControls(filters)}
    <div class="analytics-grid">
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Room-wise attendance</h2><div class="panel-subtitle">Present, absent and unmarked students by room</div></div></div>${dashboardRoomChart(metrics)}</section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Department-wise attendance</h2><div class="panel-subtitle">Attendance records grouped by student department</div></div></div>${dashboardDepartmentChart(metrics)}</section>
    </div>
    <div class="dashboard-grid">
      <div><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Upcoming examinations</h2><div class="panel-subtitle">Scheduled sessions matching your filters</div></div><button class="text-link" data-page="exams">View all →</button></div>
        <div class="table-wrap"><table><thead><tr><th>Course / subject</th><th>Date & session</th><th>Allocated</th><th>Status</th></tr></thead><tbody id="upcomingRows">${dashboardUpcoming(metrics)}</tbody></table></div></section>
        <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Room attendance details</h2><div class="panel-subtitle">Marked attendance and submission status by room</div></div><button class="text-link" data-page="rooms">Manage rooms →</button></div>
          ${metrics.rooms.length ? `<div class="table-wrap"><table><thead><tr><th>Room</th><th>Capacity / session</th><th>Allocated / sessions</th><th>Present</th><th>Absent</th><th>Unmarked</th><th>Submission</th></tr></thead><tbody>${metrics.rooms.map((room) => `<tr><td>${esc(room.number)}<div class="table-secondary">${esc(room.building)}</div></td><td>${room.capacity}</td><td>${room.allocated} / ${room.sessions} session${room.sessions === 1 ? "" : "s"}</td><td>${room.present}</td><td>${room.absent}</td><td>${room.unmarked}</td><td>${room.pendingRooms ? statusBadge("Pending", "amber") : statusBadge("Submitted", "green")}</td></tr>`).join("")}</tbody></table></div>` : emptyState("No rooms in this view", "Room details will appear when rooms have students allocated.")}</section>
      </div>
      <div><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Recent activity</h2><div class="panel-subtitle">Examination administration and attendance submissions</div></div></div>${dashboardActivity(metrics)}</section>
        <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Submission progress</h2><div class="panel-subtitle">${summary.submittedRooms} of ${summary.allocatedRooms} allocated rooms submitted</div></div><button class="text-link" data-page="attendance">Details →</button></div>${metrics.allocatedRooms ? attendanceProgressForRooms(metrics.rooms) : emptyState("No attendance submissions", "Submission progress will appear once students are allocated.")}</section>
      </div>
    </div>`;
}
function statCard(label, value, icon, note, tone = "") { return `<div class="stat-card ${tone ? `stat-${tone}` : ""}"><div class="stat-top"><span>${label}</span><span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-note">${note}</div></div>`; }
function attendanceProgressForRooms(rooms) {
  return `<div class="activity-list">${rooms.slice(0, 5).map((room) => `<div class="activity-item"><div class="activity-icon">${room.pendingRooms ? "◷" : "✓"}</div><div class="activity-copy"><strong>${esc(room.number)}</strong><span class="activity-detail">${room.allocated} students · ${room.completionPercent}% marked</span></div><div class="activity-time">${room.pendingRooms ? "Pending" : "Submitted"}</div></div>`).join("")}</div>`;
}
function renderInchargeOverview() {
  const exams = assignedExams();
  const assigned = exams.flatMap((exam) => (exam.assignments || []).filter((a) => a.inchargeId === state.selectedIncharge).map((assignment) => ({ exam, assignment })));
  const pending = assigned.filter(({ exam, assignment }) => !roomAttendance(exam.id, assignment.roomId).submitted).length;
  const present = assigned.reduce((sum, { exam, assignment }) => sum + Object.values(roomAttendance(exam.id, assignment.roomId).records).filter((value) => value === "present").length, 0);
  return `${pageHeading(`Welcome, ${esc(staffById(state.selectedIncharge)?.name || "In-Charge")}`, "Your assigned examination rooms and attendance tasks.", `<button class="button" data-page="attendance">Open attendance →</button>`)}
    <div class="stats-grid">${statCard("Assigned sessions", assigned.length, "▤", "Examination room assignments")}${statCard("Pending submissions", pending, "◷", "Complete all attendance records")}${statCard("Marked present", present, "✓", "Across your assigned rooms")}${statCard("Accessible rooms", assigned.length, "⌂", "Only rooms assigned to you")}</div>
    <section class="panel"><div class="panel-header"><div><h2 class="panel-title">My assigned rooms</h2><div class="panel-subtitle">Attendance can only be managed for the rooms listed here.</div></div></div>${assigned.length ? `<div class="table-wrap"><table><thead><tr><th>Examination</th><th>Date & session</th><th>Room</th><th>Students</th><th>Status</th><th></th></tr></thead><tbody>${assigned.map(({ exam, assignment }) => { const room = roomById(assignment.roomId); const record = roomAttendance(exam.id, assignment.roomId); return `<tr><td><div class="exam-row-title">${esc(exam.course)}</div><div class="exam-row-meta">${esc(exam.code)}</div></td><td>${dateLabel(exam.date)}<div class="table-secondary">${esc(exam.session)}</div></td><td>${esc(room?.number || "—")}</td><td>${roomCountFor(exam.id, assignment.roomId)}</td><td>${record.submitted ? statusBadge("Submitted", "green") : statusBadge("In progress", "amber")}</td><td><button class="button small" data-action="open-attendance" data-exam="${exam.id}" data-room="${assignment.roomId}">Record attendance</button></td></tr>`; }).join("")}</tbody></table></div>` : emptyState("No rooms assigned yet", "Your examination assignments will appear here.")}</section>`;
}
function assignedExams() {
  return state.exams.filter((exam) => (exam.assignments || []).some((assignment) => assignment.inchargeId === state.selectedIncharge));
}
function departments() { return [...new Set(state.students.map((student) => student.department))].sort(); }
function renderExams() {
  const exams = state.exams;
  const actions = `<button class="button primary" data-action="add-exam">＋&nbsp; Create examination</button>`;
  return `${pageHeading("Examinations", "Create, review and manage examination sessions.", actions)}
    <div class="filter-bar"><select class="filter-control" id="examDeptFilter" aria-label="Filter examinations by department"><option value="">All departments</option>${departments().map((dep) => `<option>${esc(dep)}</option>`).join("")}</select><select class="filter-control" id="examStatusFilter" aria-label="Filter examinations by status"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select><div class="filter-search"><span aria-hidden="true">⌕</span><input id="examSearch" aria-label="Search examinations" placeholder="Search examinations"></div></div>
    <div class="cards-grid" id="examCards">${exams.map(examCard).join("")}</div>`;
}
function examCard(exam) {
  const assigned = new Set(allocatedToExam(exam.id)).size;
  const roomIds = Object.keys(state.allocations[exam.id] || {});
  return `<article class="exam-card" data-exam-card data-department="${esc(exam.department)}" data-status="${exam.published ? "published" : "draft"}" data-search="${esc(`${exam.name} ${exam.course} ${exam.code}`.toLowerCase())}"><div class="exam-card-top"><span class="course-code">${esc(exam.code)}</span>${exam.published ? statusBadge("Published", "green") : statusBadge("Draft", "amber")}</div><h3>${esc(exam.course)}</h3><p>${esc(exam.name)} · ${esc(exam.department)} · Year ${exam.year} · Section ${esc(exam.section)}</p><div class="exam-card-meta"><div><div class="meta-label">DATE</div><div class="meta-value">${dateLabel(exam.date)}</div></div><div><div class="meta-label">SESSION</div><div class="meta-value">${esc(exam.session)}</div></div></div><div class="card-footer"><span>${assigned} / ${exam.eligible.length} students allocated · ${roomIds.length} rooms</span><span><button class="text-link" data-action="edit-exam" data-exam="${exam.id}">Edit</button> · <button class="text-link" data-action="exam-allocation" data-exam="${exam.id}">Review →</button></span></div></article>`;
}
function renderRooms() {
  const rooms = state.rooms;
  return `${pageHeading("Rooms & seating", "Manage available examination rooms and seating capacity.", `<button class="button primary" data-action="add-room">＋&nbsp; Add room</button>`)}
    <div class="stats-grid">${statCard("Total rooms", rooms.length, "⌂", "Registered on campus")}${statCard("Total seating capacity", rooms.reduce((sum, room) => sum + room.capacity, 0), "▦", "Across all registered rooms")}${statCard("Available now", rooms.filter((room) => room.available).length, "✓", "Ready for allocation")}${statCard("In use", rooms.filter((room) => state.exams.some((exam) => roomCountFor(exam.id, room.id) > 0)).length, "◷", "Assigned to examinations")}</div>
    <div class="room-grid">${rooms.map((room) => { const used = Math.max(...state.exams.map((exam) => roomCountFor(exam.id, room.id)), 0); const percent = Math.round(used / room.capacity * 100); return `<article class="room-card"><div class="room-card-top"><div><h3>${esc(room.number)}</h3><p>${esc(room.building)}</p></div>${room.available ? statusBadge("Available", "green") : statusBadge("Unavailable", "red")}</div><div class="room-number">SEATING CAPACITY</div><div class="room-capacity"><strong>${room.capacity}</strong><span>seats</span></div><div class="usage-track"><div class="usage-fill" style="width:${percent}%"></div></div><div class="usage-label">${used} allocated in busiest session · ${room.capacity - used} available</div><div class="card-footer"><span>${percent}% utilized</span><button class="text-link" data-action="edit-room" data-room="${room.id}">Edit room →</button></div></article>`; }).join("")}</div>`;
}
function renderStudents() {
  return `${pageHeading("Students", "Manage student records and examination eligibility.", `<button class="button primary" data-action="add-student">＋&nbsp; Add student</button>`)}
    <div class="stats-grid">${statCard("Active students", state.students.filter((student) => student.active).length, "♙", "Eligible student records")}${statCard("Departments", departments().length, "▤", "Across registered cohorts")}${statCard("Sections", new Set(state.students.map((student) => `${student.department}-${student.section}`)).size, "▦", "Active student sections")}${statCard("Inactive records", state.students.filter((student) => !student.active).length, "◷", "Not eligible for allocation")}</div>
    <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Student directory</h2><div class="panel-subtitle">Roll number, department and section records</div></div><div class="filter-search"><span aria-hidden="true">⌕</span><input id="studentSearch" aria-label="Search students" placeholder="Search students"></div></div>
    <div class="table-wrap"><table><thead><tr><th>Student</th><th>Roll number</th><th>Department</th><th>Year / section</th><th>Status</th><th></th></tr></thead><tbody id="studentRows">${state.students.map((student) => `<tr data-student-row data-search="${esc(`${student.name} ${student.roll} ${student.department}`.toLowerCase())}"><td><span class="table-primary">${esc(student.name)}</span></td><td>${esc(student.roll)}</td><td>${esc(student.department)}</td><td>Year ${student.year} · Section ${esc(student.section)}</td><td>${student.active ? statusBadge("Active", "green") : statusBadge("Inactive", "gray")}</td><td><button class="text-link" data-action="toggle-student" data-roll="${student.roll}">${student.active ? "Deactivate" : "Activate"}</button></td></tr>`).join("")}</tbody></table></div></section>`;
}
function renderAllocations() {
  const selected = examById(state.ui.selectedExam) || state.exams[0];
  if (!selected) return `${pageHeading("Allocations", "Allocate students to rooms.", `<button class="button primary" data-action="add-exam">＋ Create examination</button>`)}${emptyState("No examinations yet", "Create an examination before assigning rooms.")}`;
  const allocations = state.allocations[selected.id] || {};
  const allocatedSet = new Set(Object.values(allocations).flat());
  const unallocated = selected.eligible.filter((roll) => !allocatedSet.has(roll));
  const allocationRows = Object.entries(allocations).map(([roomId, rolls]) => {
    const room = roomById(roomId);
    if (!room) return "";
    const seatNumbers = state.seatingDetails?.[selected.id]?.[roomId] || {};
    const roster = seatingRosterCache.get(selected.id) || new Map();
    return `<div class="allocation-room"><div class="allocation-room-head"><strong>${esc(room.number)} · ${esc(room.building)}</strong><span>${rolls.length} / ${room.capacity} seats · ${room.capacity - rolls.length} available</span></div><div class="allocation-students">${rolls.map((roll, index) => `<span class="student-pill">${esc(seatNumbers[roll] || index + 1)}. ${esc(roll)}${roster.get(roll)?.name ? ` · ${esc(roster.get(roll).name)}` : ""}</span>`).join("") || `<div class="allocation-empty">No students allocated</div>`}</div></div>`;
  }).join("");
  const actionLabel = selected.published ? "Allocation published" : "Confirm & publish allocation";
  return `${pageHeading("Room allocations", "Review student assignments before making room details visible to students.", `<button class="button" data-action="load-server-exams">↻&nbsp; Load server exams</button><button class="button" data-action="export-seating" data-exam="${esc(selected.id)}">⇩&nbsp; Export CSV</button><button class="button" data-action="print-allocation">▤&nbsp; Print view</button><button class="button primary" data-action="generate-allocation" data-exam="${esc(selected.id)}" ${selected.published ? "disabled" : ""}>⚡&nbsp; Auto-allocate</button>`)}
    <div class="filter-bar"><select class="filter-control" id="allocationExamSelect">${state.exams.map((exam) => `<option value="${esc(exam.id)}" ${exam.id === selected.id ? "selected" : ""}>${esc(exam.code)} · ${esc(exam.course)} · ${dateLabel(exam.date, { day: "numeric", month: "short" })}</option>`).join("")}</select><span class="badge ${selected.published ? "green" : "amber"}">${selected.published ? "Published to students" : "Draft · not visible to students"}</span></div>
    <div class="stats-grid">${statCard("Eligible students", selected.eligible.length, "♙", `${esc(selected.department)} · Section ${esc(selected.section)}`)}${statCard("Allocated", allocatedSet.size, "✓", "Unique student assignments")}${statCard("Rooms used", Object.keys(allocations).filter((roomId) => roomCountFor(selected.id, roomId)).length, "⌂", "Rooms with allocated students")}${statCard("Unallocated", unallocated.length, "◷", unallocated.length ? "Insufficient assigned capacity" : "All students placed")}</div>
    <div class="dashboard-grid"><section class="panel"><div class="panel-header"><div><h2 class="panel-title">Room-wise allocation</h2><div class="panel-subtitle">${esc(selected.course)} · ${dateLabel(selected.date)} · ${esc(selected.session)}</div></div><button class="button primary small" data-action="publish-allocation" data-exam="${esc(selected.id)}" ${selected.published || unallocated.length ? "disabled" : ""}>${actionLabel}</button></div>${allocationRows || emptyState("No allocations to review", "Generate an allocation to get started.")}</section>
      <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Unallocated students</h2><div class="panel-subtitle">Students still needing a room</div></div>${unallocated.length ? statusBadge(`${unallocated.length} pending`, "amber") : statusBadge("Complete", "green")}</div>${unallocated.length ? `<div class="allocation-students">${unallocated.map((roll) => `<span class="student-pill">${esc(roll)} · ${esc(seatingRosterCache.get(selected.id)?.get(roll)?.name || studentByRoll(roll)?.name || "")}</span>`).join("")}</div>` : `<p class="muted-note">All eligible students have a seat assignment. The room capacity constraints are satisfied.</p>`}</section></div>`;
}
function renderAttendance() {
  if (state.role !== "incharge" || !attendanceToken) {
    return `${pageHeading("Attendance", "Attendance records are loaded from the examination server and require an authenticated room assignment.")}<section class="panel"><div class="attendance-auth-required" role="status"><strong>Invigilator sign-in required</strong><p>Only an authenticated in-charge assigned to the selected examination room can view, change, or submit its attendance.</p><button class="button primary" data-action="prompt-incharge-login">Sign in as in-charge</button></div></section>`;
  }
  const exams = state.role === "incharge" ? assignedExams() : state.exams;
  const selected = examById(state.ui.selectedExam) || exams[0];
  if (!selected) return `${pageHeading("Attendance", "Record and submit room-wise student attendance.")}${emptyState("No assigned examinations", "Attendance tasks will appear here once rooms are assigned.")}`;
  const allowedRooms = (state.role === "incharge" ? selected.assignments.filter((assignment) => assignment.inchargeId === state.selectedIncharge).map((assignment) => assignment.roomId) : Object.keys(state.allocations[selected.id] || {}));
  let roomId = allowedRooms.includes(state.ui.selectedRoom) ? state.ui.selectedRoom : allowedRooms[0];
  state.ui.selectedExam = selected.id;
  state.ui.selectedRoom = roomId;
  if (!roomId) return `${pageHeading("Attendance", "Attendance is restricted to rooms assigned to your authenticated account.")}${emptyState("No assigned rooms", "Contact an examination administrator if you should be assigned to a room.")}`;
  const key = attendanceKey(selected.id, roomId);
  const context = attendanceContexts.get(key);
  if (!context) {
    if (attendanceLoadError && attendanceLoadErrorKey === key && attendanceLoadingKey !== key) {
      return `${pageHeading("Attendance", "Attendance could not be loaded from the authoritative examination server.")}<section class="panel"><div class="dashboard-error" role="alert">${esc(attendanceLoadError)}</div><div class="form-actions"><button class="button" data-action="retry-attendance-load" data-exam="${esc(selected.id)}" data-room="${esc(roomId)}">Retry loading attendance</button></div></section>`;
    }
    return `${pageHeading("Attendance", "Loading the authoritative room attendance record…")}<section class="panel attendance-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span> Loading attendance from the examination server</section>`;
  }
  const rolls = context.students.map((student) => student.roll);
  const record = roomId ? roomAttendance(selected.id, roomId) : { submitted: false, records: {} };
  const statuses = rolls.map((roll) => record.records[roll] || "unmarked");
  const present = statuses.filter((status) => status === "present").length;
  const absent = statuses.filter((status) => status === "absent").length;
  const unmarked = statuses.filter((status) => status === "unmarked").length;
  const search = state.ui.attendanceSearch || "";
  const departmentFilter = state.ui.attendanceDepartment || "";
  const statusFilter = state.ui.attendanceStatus || "";
  const selectedRolls = new Set(state.ui.selectedAttendance || []);
  const roomPendingCount = [...pendingAttendanceChanges.values()].filter((change) => change.examId === selected.id && change.roomId === roomId).length;
  const marked = rolls.length - unmarked;
  const progress = rolls.length ? Math.round(marked / rolls.length * 100) : 0;
  const rows = rolls.map((roll, index) => {
    const student = context.students.find((item) => item.roll === roll);
    const status = record.records[roll] || "unmarked";
    const hidden = Boolean((search && !`${roll} ${student?.name || ""}`.toLowerCase().includes(search.toLowerCase())) || (departmentFilter && student?.department !== departmentFilter) || (statusFilter && status !== statusFilter));
    const changedPending = pendingAttendanceChanges.has(`${key}:${roll}`);
    return `<tr data-attendance-row data-roll="${esc(roll)}" data-department="${esc(student?.department || "")}" data-status="${status}" ${hidden ? "hidden" : ""}><td class="selection-cell">${record.submitted ? "" : `<input type="checkbox" class="row-checkbox" data-attendance-select="${esc(roll)}" aria-label="Select ${esc(student?.name || roll)}" ${selectedRolls.has(roll) ? "checked" : ""}>`}</td><td>${index + 1}</td><td><span class="table-primary">${esc(roll)}</span></td><td>${esc(student?.name || "Unknown student")}</td><td>${esc(student?.department || "—")}</td><td>${esc(student?.section || "—")}</td><td>${esc(context.exam.room_number)}</td><td>${student.seat_number}</td><td>${record.submitted ? statusBadge(status === "present" ? "Present" : "Absent", status === "present" ? "green" : "red") : `<select class="attendance-select" data-attendance-roll="${esc(roll)}" aria-label="Attendance for ${esc(student?.name || roll)}" ${changedPending ? "disabled" : ""}><option value="unmarked" ${status === "unmarked" ? "selected" : ""}>Unmarked</option><option value="present" ${status === "present" ? "selected" : ""}>Present</option><option value="absent" ${status === "absent" ? "selected" : ""}>Absent</option></select>${changedPending ? `<span class="pending-sync">Pending sync</span>` : ""}`}</td><td class="signature-cell">__________________</td></tr>`;
  }).join("");
  return `${pageHeading("Attendance", "Attendance changes are saved to the server as they are made.", `<button class="button" data-action="print-attendance">⎙&nbsp; Print attendance sheet</button>`)}
    <section class="panel"><div class="attendance-toolbar"><label class="control-label">Examination<select class="filter-control" id="attendanceExamSelect" aria-label="Choose examination">${exams.map((exam) => `<option value="${esc(exam.id)}" ${exam.id === selected.id ? "selected" : ""}>${esc(exam.code)} · ${esc(exam.course)}</option>`).join("")}</select></label><label class="control-label">Room filter<select class="filter-control" id="attendanceRoomSelect" aria-label="Filter attendance by room">${allowedRooms.map((id) => `<option value="${esc(id)}" ${id === roomId ? "selected" : ""}>${esc(roomById(id)?.number || "Room unavailable")}</option>`).join("")}</select></label><div class="table-actions attendance-submit-actions">${record.submitted ? statusBadge(`Submitted · ${esc(staffById(record.submittedBy)?.name || "In-charge")}`, "green") : statusBadge("Submission pending", "amber")}<button class="button primary small" data-action="submit-attendance" ${record.submitted || unmarked > 0 || !rolls.length || roomPendingCount > 0 || attendanceSubmissionBusy ? "disabled" : ""}>${attendanceSubmissionBusy ? "Submitting…" : "Submit attendance"}</button></div></div>
    ${record.submitted ? `<div class="attendance-success-receipt" role="status"><strong>Attendance submitted successfully</strong><span>${esc(context.exam.exam_name)} · ${esc(context.exam.code)} · ${esc(context.exam.room_number)}</span><span>Submitted ${record.submittedAt ? new Date(record.submittedAt).toLocaleString() : ""} by ${esc(staffById(record.submittedBy)?.name || record.submittedBy || "in-charge")}</span><div class="attendance-receipt-counts"><span><strong>${present}</strong>Present</span><span><strong>${absent}</strong>Absent</span><span><strong>${unmarked}</strong>Unmarked</span></div></div>` : ""}
    ${attendanceMutationError ? `<div class="attendance-sync-error" role="alert">${esc(attendanceMutationError)}<button class="button small" data-action="retry-attendance-changes">Retry unsaved attendance${roomPendingCount ? ` (${roomPendingCount})` : ""}</button></div>` : ""}
    ${roomPendingCount ? `<p class="pending-sync-notice" role="status">${roomPendingCount} attendance change${roomPendingCount === 1 ? "" : "s"} not yet confirmed by the server. Submission is blocked until synchronized.</p>` : ""}
    ${!roomId ? emptyState("No room assigned", "This examination does not have an accessible room assignment.") : `<div class="attendance-summary"><div class="summary-chip"><strong>${rolls.length}</strong>Total allocated</div><div class="summary-chip"><strong style="color:var(--green)">${present}</strong>Present</div><div class="summary-chip"><strong style="color:var(--red)">${absent}</strong>Absent</div><div class="summary-chip"><strong style="color:var(--amber)">${unmarked}</strong>Unmarked · not absent</div></div>
    <div class="progress-wrap" role="group" aria-label="Attendance marking progress"><div class="progress-copy"><span>Submission progress</span><strong>${marked} of ${rolls.length} marked</strong></div><div class="progress-track" role="progressbar" aria-label="Attendance marked" aria-valuemin="0" aria-valuemax="${rolls.length}" aria-valuenow="${marked}"><span style="width:${progress}%"></span></div></div>
    <div class="attendance-controls"><label class="search-field"><span aria-hidden="true">⌕</span><input id="attendanceSearch" type="search" placeholder="Search by roll number or student name" aria-label="Search students" value="${esc(search)}"></label><label class="control-label">Department<select id="attendanceDepartmentFilter" class="filter-control" aria-label="Filter by department"><option value="">All departments</option>${[...new Set(rolls.map((roll) => studentByRoll(roll)?.department).filter(Boolean))].map((department) => `<option ${departmentFilter === department ? "selected" : ""}>${esc(department)}</option>`).join("")}</select></label><label class="control-label">Attendance status<select id="attendanceStatusFilter" class="filter-control" aria-label="Filter by attendance status"><option value="">All statuses</option><option value="present" ${statusFilter === "present" ? "selected" : ""}>Present</option><option value="absent" ${statusFilter === "absent" ? "selected" : ""}>Absent</option><option value="unmarked" ${statusFilter === "unmarked" ? "selected" : ""}>Unmarked</option></select></label></div>
    ${record.submitted ? "" : `<div class="bulk-toolbar"><label class="select-all-control"><input type="checkbox" id="selectAllAttendance" aria-label="Select all eligible students" ${rolls.length && rolls.every((roll) => selectedRolls.has(roll)) ? "checked" : ""}> Select all eligible students</label><span class="selected-count" aria-live="polite">${selectedRolls.size} selected</span><div class="bulk-actions"><button class="button small" data-action="bulk-attendance" data-status="present" ${selectedRolls.size ? "" : "disabled"}>Mark present</button><button class="button small" data-action="bulk-attendance" data-status="absent" ${selectedRolls.size ? "" : "disabled"}>Mark absent</button></div></div>`}
    <div class="print-only"><h2>${esc(selected.name)} — Attendance Sheet</h2><p>${esc(selected.course)} (${esc(selected.code)}) · ${dateLabel(selected.date)} · ${esc(selected.session)} · ${esc(roomById(roomId)?.number)}</p></div>
    <div class="table-wrap"><table class="attendance-table"><thead><tr><th class="selection-cell" aria-label="Select students"></th><th>Sl. no.</th><th>Roll number</th><th>Student name</th><th>Department</th><th>Section</th><th>Room</th><th>Seat</th><th>Attendance status</th><th class="signature-cell">Signature</th></tr></thead><tbody>${rows || `<tr><td colspan="10">${emptyState("No students allocated", "This room has no allocated students for the selected examination.")}</td></tr>`}</tbody></table></div>
    ${unmarked ? `<p class="muted-note" style="margin:14px 0 0">Attendance is incomplete. ${unmarked} student${unmarked === 1 ? "" : "s"} still unmarked; unmarked students are not counted as absent. Mark every student before submission.</p>` : ""}
    <section class="attendance-audit"><h3>Recent attendance audit</h3>${context.audit.length ? `<ol>${context.audit.map((entry) => `<li><span>${esc(entry.studentRoll || "Room submission")}: ${esc(entry.oldStatus || "—")} → ${esc(entry.newStatus || entry.eventType)}</span><time datetime="${esc(entry.occurredAt)}">${new Date(entry.occurredAt).toLocaleString()}</time><small>By ${esc(staffById(entry.actorId)?.name || entry.actorId)}</small></li>`).join("")}</ol>` : `<p class="muted-note">No attendance changes have been recorded yet.</p>`}</section>`}</section>`;
}
function renderReports() {
  const allRecords = state.exams.flatMap((exam) => Object.entries(state.allocations[exam.id] || {}).map(([roomId, rolls]) => ({ exam, roomId, rolls, record: roomAttendance(exam.id, roomId) })));
  const finalized = allRecords.filter((item) => item.record.submitted);
  const absentees = finalized.flatMap(({ exam, roomId, record }) => Object.entries(record.records).filter(([, status]) => status === "absent").map(([roll]) => ({ exam, roomId, roll })));
  const pending = allRecords.filter((item) => !item.record.submitted);
  const roomStatement = finalized.map(({ exam, roomId, record }) => {
    const room = roomById(roomId);
    const roomAbsentees = Object.entries(record.records).filter(([, status]) => status === "absent").map(([roll]) => roll);
    const details = roomAbsentees.map((roll) => {
      const student = studentByRoll(roll);
      return `<tr><td>${dateLabel(exam.date)}</td><td><span class="table-primary">${esc(exam.course)}</span><div class="table-secondary">${esc(exam.code)}</div></td><td>${esc(room?.number || "—")}</td><td>${esc(roll)}</td><td>${esc(student?.name || "Unknown student")}</td><td>${esc(student?.department || "—")}</td><td>${dateLabel(dateOffset(0))}</td></tr>`;
    }).join("") || `<tr><td colspan="7" class="muted-note">No absentees recorded in this room.</td></tr>`;
    return `<tr><td colspan="7" style="background:#f7f7fc;color:#554fb1;font-weight:700">Room statement · ${esc(room?.number || "—")} · ${esc(exam.code)} · ${dateLabel(exam.date)} · ${roomAbsentees.length} absentee${roomAbsentees.length === 1 ? "" : "s"}</td></tr>${details}`;
  }).join("");
  const deptStats = departments().map((department) => {
    const eligible = state.students.filter((student) => student.department === department).map((student) => student.roll);
    const absentCount = absentees.filter(({ roll }) => eligible.includes(roll)).length;
    const finalizedCount = finalized.reduce((sum, item) => sum + Object.keys(item.record.records).filter((roll) => eligible.includes(roll)).length, 0);
    return `<tr><td><span class="table-primary">${esc(department)}</span></td><td>${finalizedCount}</td><td>${absentees.filter(({ roll }) => eligible.includes(roll)).length}</td><td>${finalizedCount ? Math.round((finalizedCount - absentCount) / finalizedCount * 100) : "—"}${finalizedCount ? "%" : ""}</td></tr>`;
  }).join("");
  const tableRows = absentees.map(({ exam, roomId, roll }) => absenteeRow(exam, roomId, roll)).join("");
  return `${pageHeading("Reports & absentee statements", "Review finalized attendance and generate examination reports.", `<button class="button" data-action="print-report">⎙&nbsp; Print report</button><button class="button primary" data-action="export-report">⇩&nbsp; Export CSV</button>`)}
    <div class="report-kpis"><div class="report-kpi"><strong>${absentees.length}</strong><span>Confirmed absentees</span></div><div class="report-kpi"><strong>${finalized.length} / ${allRecords.length}</strong><span>Rooms submitted</span></div><div class="report-kpi"><strong>${pending.length}</strong><span>Attendance pending</span></div></div>
    <div class="tabs"><button class="tab-button ${state.ui.reportTab === "rooms" ? "active" : ""}" data-report-tab="rooms">Room-wise statement</button><button class="tab-button ${state.ui.reportTab === "absentees" ? "active" : ""}" data-report-tab="absentees">Consolidated absentees</button><button class="tab-button ${state.ui.reportTab === "departments" ? "active" : ""}" data-report-tab="departments">Department statistics</button><button class="tab-button ${state.ui.reportTab === "pending" ? "active" : ""}" data-report-tab="pending">Pending submissions</button></div>
    ${state.ui.reportTab === "departments" ? `<section class="panel"><div class="panel-header"><div><h2 class="panel-title">Department-wise attendance</h2><div class="panel-subtitle">Statistics include finalized attendance only.</div></div></div><div class="table-wrap"><table><thead><tr><th>Department</th><th>Attendance recorded</th><th>Absentees</th><th>Attendance rate</th></tr></thead><tbody>${deptStats}</tbody></table></div></section>` : state.ui.reportTab === "pending" ? `<section class="panel"><div class="panel-header"><div><h2 class="panel-title">Awaiting attendance submission</h2><div class="panel-subtitle">Pending rooms are excluded from absentee totals.</div></div></div><div class="table-wrap"><table><thead><tr><th>Examination / course</th><th>Date</th><th>Room</th><th>Students allocated</th><th>In-charge</th><th>Status</th></tr></thead><tbody>${pending.map(({ exam, roomId, rolls }) => `<tr><td><span class="table-primary">${esc(exam.course)}</span><div class="table-secondary">${esc(exam.code)}</div></td><td>${dateLabel(exam.date)}</td><td>${esc(roomById(roomId)?.number || "—")}</td><td>${rolls.length}</td><td>${esc(staffById(exam.assignments.find((a) => a.roomId === roomId)?.inchargeId)?.name || "Not assigned")}</td><td>${statusBadge("Not submitted", "amber")}</td></tr>`).join("") || `<tr><td colspan="6">All room attendance has been submitted.</td></tr>`}</tbody></table></div></section>` : `<section class="panel"><div class="panel-header"><div><h2 class="panel-title">${state.ui.reportTab === "rooms" ? "Room-wise absentee statements" : "Consolidated absentee statement"}</h2><div class="panel-subtitle">${state.ui.reportTab === "rooms" ? "Absentees are grouped by their examination room." : "Only students marked absent in submitted rooms are shown."}</div></div></div><div class="table-wrap"><table id="absenteeTable"><thead><tr><th>Examination date</th><th>Course</th><th>Room</th><th>Roll number</th><th>Student name</th><th>Department</th><th>Report generated</th></tr></thead><tbody>${(state.ui.reportTab === "rooms" ? roomStatement : tableRows) || `<tr><td colspan="7">No finalized attendance to report.</td></tr>`}</tbody></table></div></section>`}`;
}
function absenteeRow(exam, roomId, roll) {
  const student = studentByRoll(roll);
  return `<tr><td>${dateLabel(exam.date)}</td><td><span class="table-primary">${esc(exam.course)}</span><div class="table-secondary">${esc(exam.code)} · ${esc(exam.name)}</div></td><td>${esc(roomById(roomId)?.number || "—")}</td><td>${esc(roll)}</td><td>${esc(student?.name || "Unknown student")}</td><td>${esc(student?.department || "—")}</td><td>${dateLabel(dateOffset(0))}</td></tr>`;
}
function loadStudentDashboard() {
  if (!studentToken || studentDashboard.status !== "idle") return;
  studentDashboard.status = "loading";
  SmartExamzStudentApi.getDashboard(studentToken).then((data) => {
    studentDashboard = { status: "loaded", data, error: "" };
    render();
  }).catch((error) => {
    if (handleSessionFailure(error)) return;
    studentDashboard = { status: "error", data: null, error: error.message };
    render();
  });
}

function loadAdminStudentRoster() {
  if (!adminToken || studentRosterState.status !== "idle") return;
  studentRosterState = { ...studentRosterState, status: "loading", error: "" };
  SmartExamzStudentApi.listRosterStudents(adminToken).then(({ students }) => {
    studentRosterState = { status: "loaded", students, error: "" };
    if (state.ui.page === "users" && state.role === "admin") render();
  }).catch((error) => {
    if (handleSessionFailure(error)) return;
    studentRosterState = { ...studentRosterState, status: "error", error: error.message };
    if (state.ui.page === "users" && state.role === "admin") render();
  });
}

function openStudentAccountModal(roll) {
  const student = studentRosterState.students.find((item) => item.roll === roll);
  if (!student || !adminToken || state.role !== "admin") {
    toast("Student account provisioning requires an authenticated administrator.", true);
    return;
  }
  openModal(student.accountEnabled ? "Reset student password" : "Provision student account",
    `${student.roll} · ${student.name}`, `<form id="studentAccountForm" data-student-roll="${esc(student.roll)}">
      <div class="form-grid">
        <div class="form-field full"><label for="studentAccountEmail">Student email</label><input id="studentAccountEmail" name="email" type="email" maxlength="254" value="${esc(student.email || "")}" placeholder="student@university.edu"><span class="muted-note">Optional. Leave blank to keep the current email.</span></div>
        <div class="form-field full"><label for="studentAccountPassword">Temporary password *</label><input id="studentAccountPassword" name="password" type="password" minlength="12" maxlength="256" autocomplete="new-password" required><span class="muted-note">Use at least 12 characters and share it with the student through a secure channel.</span></div>
      </div>
      <div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">${student.accountEnabled ? "Reset password" : "Provision account"}</button></div>
    </form>`);
}

function openDatabaseStudentModal() {
  if (!adminToken || state.role !== "admin") {
    toast("Adding a database roster record requires an authenticated administrator.", true);
    return;
  }
  openModal("Add database student", "Create the roster record before provisioning the student's sign-in account.", `<form id="databaseStudentForm">
    <div class="form-grid">
      <div class="form-field"><label for="databaseStudentRoll">Student ID *</label><input id="databaseStudentRoll" name="roll" maxlength="64" required></div>
      <div class="form-field"><label for="databaseStudentName">Student name *</label><input id="databaseStudentName" name="name" maxlength="160" required></div>
      <div class="form-field"><label for="databaseStudentDepartment">Department *</label><input id="databaseStudentDepartment" name="department" maxlength="120" required></div>
      <div class="form-field"><label for="databaseStudentYear">Year *</label><input id="databaseStudentYear" name="year" type="number" min="1" max="8" required></div>
      <div class="form-field"><label for="databaseStudentSection">Section *</label><input id="databaseStudentSection" name="section" maxlength="32" required></div>
    </div>
    <div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">Add roster record</button></div>
  </form>`);
}

function renderSchedule() {
  if (studentDashboard.status === "loading" || studentDashboard.status === "idle") {
    return `${pageHeading("My examination schedule", "Your published exams, room numbers and seat details in one place.")}
      <section class="panel student-dashboard-state" role="status"><span class="loading-spinner" aria-hidden="true"></span><strong>Loading your examination information…</strong></section>`;
  }
  if (studentDashboard.status === "error") {
    return `${pageHeading("My examination schedule", "Your published exams, room numbers and seat details in one place.")}
      <section class="panel student-dashboard-state" role="alert"><strong>We could not load your examination information.</strong><p>${esc(studentDashboard.error)}</p><button class="button primary" data-action="retry-student-dashboard">Try again</button></section>`;
  }
  const { student, examinations, resultsAvailable } = studentDashboard.data;
  return `${pageHeading("My examination schedule", "Your published exams, room numbers and seat details in one place.")}
    <div class="student-welcome"><div><h2>Welcome, ${esc(student.name)}</h2><p>${esc(student.roll)} · ${esc(student.department)} · Year ${student.year} · Section ${esc(student.section)}</p>${student.email ? `<p>${esc(student.email)}</p>` : ""}</div><div class="welcome-mark" aria-hidden="true">✦</div></div>
    <div class="panel-header"><div><h2 class="panel-title">Your upcoming examinations</h2><div class="panel-subtitle">Only published examination and seating information is shown.</div></div><span class="badge purple">${examinations.length} scheduled</span></div>
    ${examinations.length ? examinations.map((exam) => {
      const date = new Date(`${exam.date}T12:00:00`);
      return `<article class="student-exam"><div class="date-tile"><b>${date.getDate()}</b><span>${date.toLocaleDateString("en-IN", { month: "short" })}</span></div><div><h3>${esc(exam.courseName)}</h3><p>${esc(exam.courseCode)} · ${esc(exam.examinationName)}<br>${esc(exam.session)} session · ${date.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p></div><div class="seat-box"><span>${esc(exam.roomNumber)} · ${esc(exam.building)}</span><strong>Seat ${exam.seatNumber}</strong></div></article>`;
    }).join("") : `<section class="panel">${emptyState("No published exams yet", "Your examination schedule will be available here once your department publishes the room allocation.")}</section>`}
    <section class="panel student-results-note"><h2 class="panel-title">Examination results</h2><p class="muted-note">${resultsAvailable ? "Published results are available." : "Results are not available in this system yet."}</p></section>`;
}
function renderUserManagement() {
  return `${pageHeading("User management", "Review examination staff assigned to operational work.")}
    <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Student sign-in accounts</h2><div class="panel-subtitle">Accounts are linked to database roster records; no student passwords are seeded.</div></div><div class="heading-actions"><button class="button small" data-action="refresh-student-roster">Refresh</button><button class="button primary small" data-action="add-database-student">Add roster student</button></div></div>
    ${studentRosterState.status === "loading" || studentRosterState.status === "idle" ? `<div class="student-dashboard-state" role="status"><span class="loading-spinner" aria-hidden="true"></span><span>Loading database student records…</span></div>` : studentRosterState.status === "error" ? `<div class="student-dashboard-state" role="alert"><p>${esc(studentRosterState.error)}</p><button class="button" data-action="refresh-student-roster">Try again</button></div>` : studentRosterState.students.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Department</th><th>Year / Section</th><th>Email</th><th>Account</th><th>Action</th></tr></thead><tbody>${studentRosterState.students.map((student) => `<tr><td><strong>${esc(student.roll)}</strong><div class="table-secondary">${esc(student.name)}</div></td><td>${esc(student.department)}</td><td>${student.year} / ${esc(student.section)}</td><td>${esc(student.email || "Not set")}</td><td>${statusBadge(student.accountEnabled ? "Enabled" : "Not provisioned", student.accountEnabled ? "green" : "amber")}</td><td><button class="button small" data-action="provision-student-account" data-roll="${esc(student.roll)}">${student.accountEnabled ? "Reset password" : "Provision"}</button></td></tr>`).join("")}</tbody></table></div>` : emptyState("No database students found", "Add or import approved roster records before provisioning student accounts.")}
    <p class="muted-note">The student ID/password is verified by the server. Passwords are stored only as salted hashes; initial passwords must be delivered securely. Password recovery is not configured.</p></section>
    <section class="panel"><div class="panel-header"><div><h2 class="panel-title">Examination in-charges</h2><div class="panel-subtitle">Demo users available for room assignments and attendance.</div></div></div>
    <div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Assigned rooms</th><th>Access</th></tr></thead><tbody>${state.staff.map((member) => {
      const assignments = state.exams.flatMap((exam) => exam.assignments.filter((assignment) => assignment.inchargeId === member.id).map((assignment) => `${roomById(assignment.roomId)?.number || "Room"} · ${exam.code}`));
      return `<tr><td><span class="table-primary">${esc(member.name)}</span></td><td>Examination In-Charge</td><td>${assignments.length ? esc(assignments.join(", ")) : "No current assignments"}</td><td>${statusBadge("Active", "green")}</td></tr>`;
    }).join("")}</tbody></table></div></section>
    <section class="panel"><h2 class="panel-title">Role access</h2><p class="muted-note">Administrators manage demo records; in-charges authenticate with server-configured credentials and can access only assigned rooms; student accounts are provisioned by administrators and can view only their own published schedule through the server.</p></section>`;
}
function renderSettings() {
  return `${pageHeading("Settings", "Application preferences and data information.")}
    <section class="panel settings-panel"><div class="panel-header"><div><h2 class="panel-title">Workspace preferences</h2><div class="panel-subtitle">Settings for this browser-based demonstration.</div></div></div>
    <div class="settings-row"><div><strong>Sidebar density</strong><p>Collapse navigation to icons to give page content more room.</p></div><button class="button" data-action="toggle-sidebar">${state.ui.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</button></div>
    <div class="settings-row"><div><strong>Sample data</strong><p>Administration demo records are saved in this browser. Attendance status, submissions, and audit events are stored by the SQLite attendance service.</p></div><span class="badge purple">SQLite attendance service</span></div>
    <div class="settings-row"><div><strong>Application version</strong><p>SmartExamz Examination Management demo</p></div><span class="table-secondary">Vanilla HTML, CSS & JavaScript</span></div></section>`;
}
function emptyState(title, text) { return `<div class="empty-state"><div class="empty-icon">▤</div><strong>${esc(title)}</strong>${esc(text)}</div>`; }
function render() {
  const appShell = $(".app-shell");
  const loginRoot = $("#loginRoot");
  $(".skip-link").href = isAuthenticated ? "#appContent" : "#loginMain";
  appShell.hidden = !isAuthenticated;
  loginRoot.hidden = isAuthenticated;
  if (!isAuthenticated) {
    $("#modalRoot").innerHTML = "";
    renderLogin();
    return;
  }
  loginRoot.innerHTML = "";
  renderNav();
  const page = state.ui.page;
  const html = page === "overview" ? renderOverview() : page === "exams" ? renderExams() : page === "rooms" ? renderRooms() : page === "students" ? renderStudents() : page === "allocations" ? renderAllocations() : page === "attendance" ? renderAttendance() : page === "reports" ? renderReports() : page === "users" ? renderUserManagement() : page === "settings" ? renderSettings() : renderSchedule();
  $("#appContent").innerHTML = html;
  save();
  if (state.role === "student" && studentDashboard.status === "idle") loadStudentDashboard();
  if (page === "users" && state.role === "admin" && adminToken && studentRosterState.status === "idle") loadAdminStudentRoster();
  if (page === "attendance" && state.role === "incharge" && attendanceToken) {
    loadAttendanceRoom(state.ui.selectedExam, state.ui.selectedRoom);
  }
}

function openModal(title, subtitle, body) {
  modalReturnFocus = document.activeElement;
  $("#modalRoot").innerHTML = `<div class="modal-backdrop" data-close-modal><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" aria-describedby="modalDescription"><div class="modal-head"><div><h2 id="modalTitle">${esc(title)}</h2><p id="modalDescription">${esc(subtitle)}</p></div><button class="modal-close" data-close-modal aria-label="Close">×</button></div><div class="modal-body">${body}</div></section></div>`;
  ($(".modal-body input:not([type='checkbox'])") || $(".modal-body select") || $(".modal-body button") || $(".modal-close"))?.focus();
}
function closeModal() {
  $("#modalRoot").innerHTML = "";
  if (modalReturnFocus?.isConnected) modalReturnFocus.focus();
  modalReturnFocus = null;
}
function openInchargeLoginModal() {
  openModal("In-charge sign in", "Authenticate with your server-configured in-charge credentials.", `<form id="inchargeLoginForm">
    <div class="form-grid">
      <div class="form-field full"><label for="loginInvigilator">In-charge</label><select id="loginInvigilator" name="invigilatorId" required>${state.staff.map((member) => `<option value="${esc(member.id)}" ${member.id === state.selectedIncharge ? "selected" : ""}>${esc(member.name)}</option>`).join("")}</select></div>
      <div class="form-field full"><label for="loginPassword">Password</label><input id="loginPassword" name="password" type="password" autocomplete="current-password" required></div>
    </div>
    <p class="muted-note">Your password is sent to the attendance server for verification and is not stored in this browser.</p>
    <div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">Sign in</button></div>
  </form>`);
}
function openAdminLoginModal(examId) {
  pendingAdminAction = { type: "propose", examId };
  openModal("Administrator sign in", "Authenticate before generating or changing server-backed seating.", `<form id="adminLoginForm">
    <div class="form-grid">
      <div class="form-field full"><label for="adminUserId">Administrator account</label><input id="adminUserId" name="userId" autocomplete="username" required></div>
      <div class="form-field full"><label for="adminPassword">Password</label><input id="adminPassword" name="password" type="password" autocomplete="current-password" required></div>
    </div>
    <p class="muted-note">Administrator credentials are verified by the examination server and are not stored in this browser.</p>
    <div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">Sign in</button></div>
  </form>`);
}
async function refreshServerExams() {
  const remote = await SmartExamzSeatingApi.listExams(adminToken);
  const previousSelection = state.ui.selectedExam;
  state.exams = remote.exams.map((exam) => ({
    id: exam.id, name: exam.name, code: exam.code, course: exam.course, date: exam.date,
    session: exam.session, department: exam.department, year: exam.year, section: exam.section,
    eligible: exam.eligible, published: exam.allocationStatus === "published", assignments: []
  }));
  state.rooms = remote.rooms.map((room) => ({
    id: room.id, number: room.number, building: room.building, capacity: room.capacity,
    available: Boolean(room.available)
  }));
  const existingStaff = new Map(state.staff.map((member) => [member.id, member]));
  remote.invigilators.forEach((id) => { if (!existingStaff.has(id)) existingStaff.set(id, { id, name: id }); });
  state.staff = [...existingStaff.values()];
  state.allocations = {};
  state.seatingDetails = {};
  state.ui.selectedExam = state.exams.some((exam) => exam.id === previousSelection)
    ? previousSelection : state.exams[0]?.id || "";
  if (state.ui.selectedExam) {
    const allocation = await SmartExamzSeatingApi.getAllocation(state.ui.selectedExam, adminToken);
    syncAllocationPayload(allocation);
  }
  state.ui.page = "allocations";
  save();
  render();
}
async function loadServerExams() {
  if (!adminToken) {
    openAdminLoginModal(state.ui.selectedExam);
    pendingAdminAction = { type: "refresh", examId: state.ui.selectedExam };
    return;
  }
  try {
    await refreshServerExams();
    toast("Examinations and rooms loaded from the server.");
  } catch (error) {
    if (handleSessionFailure(error)) return;
    toast(error.message, true);
  }
}
function openExamModal() {
  const departmentsList = departments();
  openModal("Create examination", "Set up the exam details and select eligible students.", `<form id="examForm"><div class="form-grid">
    <div class="form-field full"><label for="examName">Examination name *</label><input id="examName" name="name" required placeholder="e.g. End-Semester Examination"></div>
    <div class="form-field"><label for="examCode">Course / subject code *</label><input id="examCode" name="code" required placeholder="CS204"></div>
    <div class="form-field"><label for="examCourse">Course / subject name *</label><input id="examCourse" name="course" required placeholder="Data Structures"></div>
    <div class="form-field"><label for="examDate">Examination date *</label><input id="examDate" name="date" type="date" required min="${dateOffset(0)}"></div>
    <div class="form-field"><label for="examSession">Session *</label><select id="examSession" name="session"><option>Morning</option><option>Afternoon</option><option>Evening</option></select></div>
    <div class="form-field"><label for="examDepartment">Department *</label><select id="examDepartment" name="department">${departmentsList.map((dep) => `<option>${esc(dep)}</option>`).join("")}</select></div>
    <div class="form-field"><label for="examYear">Year *</label><select id="examYear" name="year"><option value="1">Year 1</option><option value="2" selected>Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select></div>
    <div class="form-field"><label for="examSection">Section *</label><select id="examSection" name="section"><option>A</option><option>B</option><option>C</option></select></div>
    <div class="form-field full"><label>Eligible students *</label><div id="eligibleStudentList" class="check-list">${eligibleCheckboxes(departmentsList[0], 2, "A")}</div><div class="muted-note">Students are selected by department, year and section. You can include all matching active students.</div></div>
  </div><div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">Create examination</button></div></form>`);
}
function openExamEditModal(exam) {
  if (!exam) return;
  openModal("Edit examination", "Update the examination and course details.", `<form id="examEditForm" data-exam-id="${esc(exam.id)}"><div class="form-grid">
    <div class="form-field full"><label for="examName">Examination name *</label><input id="examName" name="name" required value="${esc(exam.name)}"></div>
    <div class="form-field"><label for="examCode">Course / subject code *</label><input id="examCode" name="code" required value="${esc(exam.code)}"></div>
    <div class="form-field"><label for="examCourse">Course / subject name *</label><input id="examCourse" name="course" required value="${esc(exam.course)}"></div>
    <div class="form-field"><label for="examDate">Examination date *</label><input id="examDate" name="date" type="date" required min="${dateOffset(0)}" value="${esc(exam.date)}"></div>
    <div class="form-field"><label for="examSession">Session *</label><select id="examSession" name="session">${["Morning", "Afternoon", "Evening"].map((session) => `<option ${exam.session === session ? "selected" : ""}>${session}</option>`).join("")}</select></div>
  </div><p class="muted-note">Department, year, section and eligible students remain unchanged to protect existing room assignments.</p><div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">Save examination</button></div></form>`);
}
function eligibleCheckboxes(department, year, section) {
  const matching = state.students.filter((student) => student.active && student.department === department && student.year === Number(year) && student.section === section);
  return matching.length ? matching.map((student) => `<label class="check-item"><input type="checkbox" name="eligible" value="${esc(student.roll)}" checked><span>${esc(student.roll)} · ${esc(student.name)}</span></label>`).join("") : `<span class="muted-note">No active students in this cohort.</span>`;
}
function openRoomModal(roomId = null) {
  const room = roomId ? roomById(roomId) : null;
  openModal(room ? "Edit room" : "Add examination room", "Set room identity, location and seating capacity.", `<form id="roomForm"><div class="form-grid">
    <div class="form-field"><label for="roomNumber">Room number / name *</label><input name="number" id="roomNumber" required value="${esc(room?.number || "")}" placeholder="A-101"></div>
    <div class="form-field"><label for="roomBuilding">Building / block *</label><input name="building" id="roomBuilding" required value="${esc(room?.building || "")}" placeholder="A Block"></div>
    <div class="form-field"><label for="roomCapacity">Maximum seating capacity *</label><input name="capacity" id="roomCapacity" type="number" min="${room && roomIsAllocated(room.id) ? roomUsage(room.id) : 1}" required value="${room?.capacity || ""}" placeholder="40"></div>
    <div class="form-field"><label for="roomStatus">Availability</label><select name="available" id="roomStatus"><option value="true" ${room?.available !== false ? "selected" : ""}>Available</option><option value="false" ${room?.available === false ? "selected" : ""}>Unavailable</option></select></div>
  </div><div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">${room ? "Save changes" : "Add room"}</button></div></form>`);
  if (room) $("#roomForm").dataset.roomId = room.id;
}
function roomUsage(roomId) { return Math.max(...state.exams.map((exam) => roomCountFor(exam.id, roomId)), 0); }
function roomIsAllocated(roomId) { return roomUsage(roomId) > 0; }
function openStudentModal() {
  const depOptions = departments().map((dep) => `<option>${esc(dep)}</option>`).join("");
  openModal("Add student", "Add a student record for examination eligibility.", `<form id="studentForm"><div class="form-grid">
    <div class="form-field"><label>Roll number *</label><input name="roll" required placeholder="ST24031"></div><div class="form-field"><label>Student name *</label><input name="name" required placeholder="Student full name"></div>
    <div class="form-field"><label>Department *</label><select name="department">${depOptions}</select></div><div class="form-field"><label>Year *</label><select name="year"><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></select></div>
    <div class="form-field"><label>Section *</label><select name="section"><option>A</option><option>B</option><option>C</option></select></div>
  </div><div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="submit">Add student</button></div></form>`);
}
function buildAllocation(exam) {
  if (!exam) return;
  if (exam.published) { toast("Published seating cannot be regenerated.", true); return; }
  if (!adminToken) { openAdminLoginModal(exam.id); return; }
  proposeAllocation(exam.id);
}
function syncAllocationPayload(data) {
  const exam = examById(data.exam.id);
  if (!exam) return;
  exam.published = data.exam.allocationStatus === "published";
  exam.eligible = data.students.map((student) => student.roll);
  exam.assignments = [...new Map(data.assignments.map((assignment) => [assignment.roomId, {
    roomId: assignment.roomId, inchargeId: assignment.invigilatorId
  }])).values()];
  data.rooms.forEach((roomData) => {
    const room = roomById(roomData.id);
    if (room) {
      room.capacity = roomData.capacity;
      room.available = Boolean(roomData.available);
    } else {
      state.rooms.push({ id: roomData.id, number: roomData.number, building: roomData.building, capacity: roomData.capacity, available: Boolean(roomData.usable) });
    }
  });
  const allocation = {};
  state.seatingDetails ||= {};
  state.seatingDetails[exam.id] = {};
  seatingRosterCache.set(exam.id, new Map(data.students.map((student) => [student.roll, student])));
  data.assignments.slice().sort((a, b) => a.seatNumber - b.seatNumber || a.studentRoll.localeCompare(b.studentRoll))
    .forEach((assignment) => {
      (allocation[assignment.roomId] ||= []).push(assignment.studentRoll);
      (state.seatingDetails[exam.id][assignment.roomId] ||= {})[assignment.studentRoll] = assignment.seatNumber;
    });
  state.allocations[exam.id] = allocation;
}
function allocationProposalMarkup(proposal) {
  const studentByRoll = new Map(proposal.students.map((student) => [student.roll, student]));
  const assignmentByStudent = new Map(proposal.assignments.map((assignment) => [assignment.studentRoll, assignment]));
  const usableRooms = proposal.rooms.filter((room) => room.usable);
  const assignedByRoom = new Map();
  proposal.assignments.forEach((assignment) => assignedByRoom.set(assignment.roomId, (assignedByRoom.get(assignment.roomId) || 0) + 1));
  const roomOptions = `<option value="">Unallocated</option>${usableRooms.map((room) => `<option value="${esc(room.id)}">${esc(room.number)} · capacity ${room.capacity}</option>`).join("")}`;
  const bodyRows = proposal.students.map((student) => {
    const assigned = assignmentByStudent.get(student.roll);
    const clash = proposal.studentClashes.filter((entry) => entry.studentRoll === student.roll);
    const reason = clash.length ? `Timetable clash: ${clash.map((entry) => esc(entry.code)).join(", ")}` : "";
    return `<tr><td>${esc(student.roll)}</td><td>${esc(student.name)}</td><td>${esc(student.department)} · ${esc(student.section)}</td><td><select class="filter-control" data-proposal-room="${esc(student.roll)}" ${clash.length ? "disabled" : ""}>${roomOptions.replace(`value="${esc(assigned?.roomId || "")}"`, `value="${esc(assigned?.roomId || "")}" selected`)}</select></td><td><input class="filter-control seat-number-input" type="number" min="1" max="${esc(proposal.rooms.find((room) => room.id === assigned?.roomId)?.capacity || "")}" value="${esc(assigned?.seatNumber || "")}" data-proposal-seat="${esc(student.roll)}" aria-label="Seat number for ${esc(student.roll)}" ${clash.length ? "disabled" : ""}></td><td>${reason || (assigned ? "Assigned" : "Not enough room capacity")}</td></tr>`;
  }).join("");
  const roomsUsed = [...assignedByRoom.keys()];
  usableRooms.forEach((room) => { if (!roomsUsed.includes(room.id)) roomsUsed.push(room.id); });
  const inchargeInputs = roomsUsed.map((roomId) => {
    const room = proposal.rooms.find((item) => item.id === roomId);
    const selected = proposal.assignments.find((item) => item.roomId === roomId)?.invigilatorId;
    return `<label class="form-field"><span>${esc(room?.number || roomId)} responsible in-charge</span><select class="filter-control" data-allocation-incharge="${esc(roomId)}" required>${state.staff.map((member) => `<option value="${esc(member.id)}" ${member.id === selected ? "selected" : ""}>${esc(member.name)}</option>`).join("")}</select></label>`;
  }).join("");
  const unallocated = proposal.students.length - proposal.assignments.length;
  const roomStatus = proposal.rooms.map((room) => `<span class="student-pill">${esc(room.number)} · ${room.usable ? `${room.capacity} seats available` : "Unavailable / timetable clash"}</span>`).join("");
  return `<div class="allocation-rule-controls">
      <label class="form-field"><span>Room strategy</span><select id="allocationRoomStrategy" class="filter-control"><option value="fewestRooms" ${proposal.rules.roomStrategy === "fewestRooms" ? "selected" : ""}>Use the fewest rooms</option><option value="balanced" ${proposal.rules.roomStrategy === "balanced" ? "selected" : ""}>Distribute across rooms</option></select></label>
      <label class="form-field"><span>Student order</span><select id="allocationStudentOrder" class="filter-control"><option value="rollAscending" ${proposal.rules.studentOrder === "rollAscending" ? "selected" : ""}>Roll number ascending</option><option value="rollDescending" ${proposal.rules.studentOrder === "rollDescending" ? "selected" : ""}>Roll number descending</option></select></label>
      <button class="button" type="button" data-action="regenerate-allocation">Regenerate</button>
    </div>
    <p class="muted-note">Server proposal: ${proposal.assignments.length} seats assigned · ${unallocated} unallocated. Review or edit room and seat values before saving. Room capacities and timetable clashes are revalidated by the server.</p>
    <div class="allocation-room-list" aria-label="Available rooms and capacities">${roomStatus}</div>
    <div class="table-wrap allocation-review-table"><table><thead><tr><th>Roll</th><th>Student</th><th>Department / section</th><th>Room</th><th>Seat</th><th>Note</th></tr></thead><tbody>${bodyRows}</tbody></table></div>
    <div class="form-grid allocation-incharges">${inchargeInputs}</div>
    <div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="button" data-action="confirm-allocation">Save draft</button></div>`;
}
async function proposeAllocation(examId, rules = { roomStrategy: "fewestRooms", studentOrder: "rollAscending" }) {
  try {
    const data = await SmartExamzSeatingApi.propose(examId, rules, adminToken);
    syncAllocationPayload(data);
    pendingAllocation = { examId, proposal: data };
    openModal("Review proposed seating", `${data.exam.code} · ${data.exam.course} · ${data.assignments.length} placed · ${data.unallocated.length} unallocated`, allocationProposalMarkup(data));
  } catch (error) {
    if (handleSessionFailure(error)) return;
    toast(error.message, true);
  }
}
async function regenerateAllocationProposal() {
  if (!pendingAllocation || !adminToken) return;
  const examId = pendingAllocation.examId;
  const rules = { roomStrategy: $("#allocationRoomStrategy").value, studentOrder: $("#allocationStudentOrder").value };
  await proposeAllocation(examId, rules);
}
async function confirmAllocation() {
  if (!pendingAllocation || !adminToken) return;
  const { examId, proposal } = pendingAllocation;
  const assignments = proposal.students.flatMap((student) => {
    const roomId = $(`[data-proposal-room="${CSS.escape(student.roll)}"]`)?.value || "";
    const seatValue = $(`[data-proposal-seat="${CSS.escape(student.roll)}"]`)?.value || "";
    return roomId && seatValue ? [{ studentRoll: student.roll, roomId, seatNumber: Number(seatValue) }] : [];
  });
  const roomIncharges = Object.fromEntries([...document.querySelectorAll("[data-allocation-incharge]")].map((select) => [select.dataset.allocationIncharge, select.value]));
  try {
    const result = await SmartExamzSeatingApi.saveDraft(examId, { assignments, roomIncharges }, adminToken);
    syncAllocationPayload(result);
    pendingAllocation = null;
    closeModal();
    recordActivity("allocation_saved", `Saved seating allocation for ${examById(examId)?.code || examId}`, { examId });
    save();
    render();
    toast("Seating draft saved on the examination server.");
  } catch (error) {
    if (handleSessionFailure(error)) return;
    toast(error.message, true);
  }
}
function publishAllocation(examId) {
  const exam = examById(examId);
  if (!exam) return;
  if (!adminToken) { openAdminLoginModal(examId); pendingAdminAction = { type: "publish", examId }; return; }
  openModal("Publish seating plan?", `Publish ${esc(exam.code)} to make room and seat information available to students?`, `<p class="muted-note">The server will verify every eligible student is assigned exactly once, all room capacities, and timetable constraints. Published allocations cannot be silently replaced.</p><div class="form-actions"><button class="button" type="button" data-close-modal>Cancel</button><button class="button primary" type="button" data-action="confirm-publish-allocation" data-exam="${esc(examId)}">Publish seating</button></div>`);
}
async function finalizeAllocationPublication(examId) {
  try {
    const result = await SmartExamzSeatingApi.publish(examId, adminToken);
    syncAllocationPayload(result);
    recordActivity("allocation_published", `Published student seating for ${examById(examId)?.code || examId}`, { examId });
    save();
    closeModal();
    render();
    toast("Seating published. Students can now view their seats.");
  } catch (error) {
    if (handleSessionFailure(error)) return;
    toast(error.message, true);
  }
}
async function exportSeatingCsv(examId) {
  if (!adminToken) { openAdminLoginModal(examId); pendingAdminAction = { type: "export", examId }; return; }
  try {
    const blob = await SmartExamzSeatingApi.exportCsv(examId, adminToken);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `seating-${examId}.csv`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    if (handleSessionFailure(error)) return;
    toast(error.message, true);
  }
}
async function printSeatingPlan() {
  if (!adminToken) {
    openAdminLoginModal(state.ui.selectedExam);
    pendingAdminAction = { type: "print", examId: state.ui.selectedExam };
    return;
  }
  try {
    const data = await SmartExamzSeatingApi.getAllocation(state.ui.selectedExam, adminToken);
    syncAllocationPayload(data);
    render();
    requestAnimationFrame(() => window.print());
  } catch (error) {
    if (handleSessionFailure(error)) return;
    toast(error.message, true);
  }
}
async function submitAttendance() {
  const examId = state.ui.selectedExam;
  const roomId = state.ui.selectedRoom;
  if (state.role !== "incharge" || !attendanceToken || !examById(examId)?.assignments.some((a) => a.roomId === roomId && a.inchargeId === state.selectedIncharge)) { toast("Only the authenticated in-charge assigned to this room can submit attendance.", true); return; }
  const record = roomAttendance(examId, roomId);
  if (record.submitted) { toast("This attendance sheet has already been submitted.", true); return; }
  const rolls = attendanceContexts.get(attendanceKey(examId, roomId))?.students.map((student) => student.roll) || [];
  const unmarked = rolls.filter((roll) => !["present", "absent"].includes(record.records[roll]));
  if (unmarked.length) { toast(`Mark all students before submitting. ${unmarked.length} remain unmarked.`, true); return; }
  if (pendingAttendanceChanges.size) { toast("Wait for pending attendance changes to synchronize before submission.", true); return; }
  attendanceMutationError = "";
  attendanceSubmissionBusy = true;
  render();
  try {
    const receipt = await SmartExamzAttendanceApi.submit({ examId, roomId, token: attendanceToken });
    attendanceSubmissionBusy = false;
    const payload = attendanceContexts.get(attendanceKey(examId, roomId));
    payload.exam.submitted_at = receipt.submittedAt;
    payload.exam.submitted_by = receipt.submittedBy;
    applyAttendancePayload(payload);
    recordActivity("attendance_submitted", `Submitted attendance for ${receipt.exam.room_number} · ${receipt.exam.code}`, { examId, roomId });
    save();
    render();
    showAttendanceReceipt(receipt);
  } catch (error) {
    attendanceSubmissionBusy = false;
    try {
      const fresh = await SmartExamzAttendanceApi.getRoom(examId, roomId, attendanceToken);
      applyAttendancePayload(fresh);
      if (fresh.exam.submitted_at) {
        const receipt = {
          exam: {
            name: fresh.exam.exam_name, code: fresh.exam.code, course: fresh.exam.course,
            exam_date: fresh.exam.exam_date, session: fresh.exam.session,
            room_number: fresh.exam.room_number, building: fresh.exam.building
          },
          submittedAt: fresh.exam.submitted_at,
          submittedBy: fresh.exam.submitted_by,
          counts: fresh.counts
        };
        render();
        showAttendanceReceipt(receipt);
        return;
      }
    } catch (refreshError) {
      attendanceMutationError = `${error.message} Recheck failed: ${refreshError.message}`;
      if (handleSessionFailure(refreshError)) return;
    }
    if (!attendanceMutationError) attendanceMutationError = error.message;
    if (handleSessionFailure(error)) return;
    render();
    toast(error.message, true);
  }
}
function confirmAttendanceSubmission() {
  const exam = examById(state.ui.selectedExam);
  const room = roomById(state.ui.selectedRoom);
  const rolls = attendanceContexts.get(attendanceKey(state.ui.selectedExam, state.ui.selectedRoom))?.students.map((student) => student.roll) || [];
  const record = roomAttendance(state.ui.selectedExam, state.ui.selectedRoom);
  const unmarked = rolls.filter((roll) => !["present", "absent"].includes(record.records[roll]));
  if (!exam || !room || state.role !== "incharge" || !attendanceToken || unmarked.length || record.submitted || pendingAttendanceChanges.size || attendanceSubmissionBusy) { toast("Attendance cannot be submitted. Confirm authorization, synchronize all changes, mark every student, and keep the sheet open.", true); return; }
  const present = rolls.filter((roll) => record.records[roll] === "present").length;
  const absent = rolls.filter((roll) => record.records[roll] === "absent").length;
  openModal("Submit attendance?", `${exam.code} · ${room.number}`, `<p class="confirm-copy">Finalize attendance for ${rolls.length} students in ${esc(room.number)}? This will permanently lock the room record.</p><div class="attendance-receipt-counts"><span><strong>${present}</strong>Present</span><span><strong>${absent}</strong>Absent</span><span><strong>${unmarked.length}</strong>Unmarked</span></div><div class="form-actions"><button class="button" data-close-modal>Review sheet</button><button class="button primary" data-action="confirm-submit-attendance">Finalize attendance</button></div>`);
}
function showAttendanceReceipt(receipt) {
  const submitted = new Date(receipt.submittedAt);
  openModal("Attendance submitted", "Server confirmation receipt", `<div class="attendance-receipt" role="status">
    <div><span>Examination</span><strong>${esc(receipt.exam.name || receipt.exam.exam_name)} · ${esc(receipt.exam.code)}</strong><small>${esc(receipt.exam.course)} · ${dateLabel(receipt.exam.exam_date)} · ${esc(receipt.exam.session)}</small></div>
    <div><span>Room</span><strong>${esc(receipt.exam.room_number)} · ${esc(receipt.exam.building)}</strong></div>
    <div><span>Submitted at</span><strong>${submitted.toLocaleString()}</strong><small>Confirmed by ${esc(staffById(receipt.submittedBy)?.name || receipt.submittedBy)}</small></div>
    <div class="attendance-receipt-counts"><span><strong>${receipt.counts.present}</strong>Present</span><span><strong>${receipt.counts.absent}</strong>Absent</span><span><strong>${receipt.counts.unmarked}</strong>Unmarked</span></div>
  </div><div class="form-actions"><button class="button primary" data-close-modal>Done</button></div>`);
}
function requestBulkAttendance(status) {
  const exam = examById(state.ui.selectedExam);
  const roomId = state.ui.selectedRoom;
  const room = roomById(roomId);
  const record = roomAttendance(state.ui.selectedExam, roomId);
  const selected = (state.ui.selectedAttendance || []).filter((roll) => (state.allocations[state.ui.selectedExam]?.[roomId] || []).includes(roll));
  if (state.role === "incharge" && !exam?.assignments.some((assignment) => assignment.roomId === roomId && assignment.inchargeId === state.selectedIncharge)) { toast("You are not assigned to this room.", true); return; }
  if (!selected.length || record.submitted || !["present", "absent"].includes(status)) { toast("Select eligible students on an open attendance sheet before using bulk marking.", true); return; }
  pendingBulkAttendance = { examId: state.ui.selectedExam, roomId, rolls: selected, status };
  openModal(`Mark ${status}?`, `${selected.length} selected student${selected.length === 1 ? "" : "s"} · ${room?.number || "Room"}`, `<p class="confirm-copy">${selected.length} selected student${selected.length === 1 ? "" : "s"} will be marked <strong>${status}</strong>. This will replace any existing attendance status for those students.</p><div class="form-actions"><button class="button" data-close-modal>Cancel</button><button class="button primary" data-action="confirm-bulk-attendance">Confirm bulk mark</button></div>`);
}
async function applyBulkAttendance(examId, roomId, rolls, status) {
  let saved = 0;
  for (const roll of rolls) {
    if (await queueAttendanceChange(examId, roomId, roll, status)) saved += 1;
  }
  if (saved) toast(`${saved} of ${rolls.length} student${rolls.length === 1 ? "" : "s"} marked ${status} on the server.`);
}
function applyAttendanceFilters() {
  const search = ($("#attendanceSearch")?.value || "").trim().toLowerCase();
  const department = $("#attendanceDepartmentFilter")?.value || "";
  const status = $("#attendanceStatusFilter")?.value || "";
  state.ui.attendanceSearch = search;
  state.ui.attendanceDepartment = department;
  state.ui.attendanceStatus = status;
  document.querySelectorAll("[data-attendance-row]").forEach((row) => {
    const roll = row.dataset.roll.toLowerCase();
    const name = row.children[3]?.textContent.toLowerCase() || "";
    row.hidden = Boolean((search && !`${roll} ${name}`.includes(search)) || (department && row.dataset.department !== department) || (status && row.dataset.status !== status));
  });
}
async function exportCSV(button) {
  const originalLabel = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = `<span class="loading-spinner" aria-hidden="true"></span> Preparing export…`;
  }
  const lines = [["Examination date", "Course", "Course code", "Room", "Roll number", "Student name", "Department", "Report generated"]];
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    let processed = 0;
    for (const exam of state.exams) {
      for (const [roomId, record] of Object.entries(state.attendance[exam.id] || {})) {
        if (!record.submitted) continue;
        for (const [roll, status] of Object.entries(record.records)) {
          if (status !== "absent") continue;
          const student = studentByRoll(roll);
          lines.push([exam.date, exam.course, exam.code, roomById(roomId)?.number || "", roll, student?.name || "", student?.department || "", dateOffset(0)]);
          processed += 1;
          if (processed % 200 === 0) await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }
    }
    const csv = lines.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    try {
      const link = document.createElement("a");
      link.href = url; link.download = "smartexamz-absentee-statement.csv"; link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
    toast("Absentee statement exported as CSV.");
  } catch (error) {
    console.error("Unable to export the absentee statement.", error);
    toast("The absentee statement could not be exported. Please try again.", true);
  } finally {
    if (button) {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = originalLabel;
    }
  }
}
function filterDashboard() {
  state.ui.dashboardFilters = {
    examId: $("#dashboardExamFilter")?.value || "",
    courseCode: $("#dashboardCourseFilter")?.value || "",
    department: $("#dashboardDeptFilter")?.value || "",
    date: $("#dashboardDateFilter")?.value || "",
    roomId: $("#dashboardRoomFilter")?.value || ""
  };
  save();
  render();
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-page], [data-action], [data-close-modal], [data-report-tab]");
  if (!target) return;
  if (target.hasAttribute("data-close-modal")) { if (target === event.target || target.classList.contains("modal-close")) closeModal(); return; }
  if (target.dataset.page) { state.ui.page = target.dataset.page; state.ui.mobileSidebarOpen = false; render(); return; }
  if (target.dataset.reportTab) { state.ui.reportTab = target.dataset.reportTab; render(); return; }
  const action = target.dataset.action;
  if (action === "sign-out") {
    if (pendingAttendanceChanges.size) {
      toast("Synchronize pending attendance changes before signing out.", true);
      return;
    }
    const token = authenticatedRole === "incharge" ? attendanceToken : authenticatedRole === "student" ? studentToken : adminToken;
    isAuthenticated = false;
    loginRole = state.role;
    authenticatedRole = "";
    attendanceToken = null;
    adminToken = null;
    studentToken = null;
    studentDashboard = { status: "idle", data: null, error: "" };
    studentRosterState = { status: "idle", students: [], error: "" };
    attendanceContexts.clear();
    loginErrorMessage = "";
    closeModal();
    render();
    if (token) SmartExamzAttendanceApi.logout(token).catch((error) => {
      console.warn("Could not revoke the server session during sign-out.", error);
      toast("You have been signed out on this device, but the server could not confirm session revocation.", true);
    });
    return;
  }
  if (action === "toggle-password") {
    const password = $("#loginPassword");
    if (password) {
      const reveal = password.type === "password";
      password.type = reveal ? "text" : "password";
      target.setAttribute("aria-pressed", String(reveal));
      target.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      password.focus();
    }
    return;
  }
  if (action === "retry-student-dashboard") {
    studentDashboard = { status: "idle", data: null, error: "" };
    render();
    return;
  }
  if (action === "refresh-student-roster") {
    studentRosterState = { ...studentRosterState, status: "idle", error: "" };
    render();
    return;
  }
  if (action === "provision-student-account") {
    openStudentAccountModal(target.dataset.roll);
    return;
  }
  if (action === "add-database-student") {
    openDatabaseStudentModal();
    return;
  }
  if (action === "forgot-password") {
    loginErrorMessage = "Password reset is not configured. Please contact your examination office.";
    $("#loginError").textContent = loginErrorMessage;
    $("#loginError").hidden = false;
    return;
  }
  if (action === "prompt-incharge-login") openInchargeLoginModal();
  else if (action === "retry-attendance-load") {
    const key = attendanceKey(target.dataset.exam, target.dataset.room);
    attendanceContexts.delete(key);
    attendanceLoadError = "";
    attendanceLoadErrorKey = "";
    loadAttendanceRoom(target.dataset.exam, target.dataset.room);
  }
  else if (action === "retry-attendance-changes") retryAttendanceChanges();
  else if (action === "clear-dashboard-filters") { state.ui.dashboardFilters = {}; save(); render(); }
  else if (action === "toggle-sidebar") {
    if (window.matchMedia("(max-width: 900px)").matches) state.ui.mobileSidebarOpen = !state.ui.mobileSidebarOpen;
    else state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
    render(); return;
  }
  if (action === "close-mobile-sidebar") { state.ui.mobileSidebarOpen = false; render(); $("#sidebarToggle").focus(); return; }
  if (action === "add-exam") openExamModal();
  else if (action === "edit-exam") openExamEditModal(examById(target.dataset.exam));
  else if (action === "add-room") openRoomModal();
  else if (action === "edit-room") openRoomModal(target.dataset.room);
  else if (action === "add-student") openStudentModal();
  else if (action === "load-server-exams") loadServerExams();
  else if (action === "generate-allocation") buildAllocation(examById(target.dataset.exam));
  else if (action === "regenerate-allocation") regenerateAllocationProposal();
  else if (action === "confirm-allocation") confirmAllocation();
  else if (action === "publish-allocation") publishAllocation(target.dataset.exam);
  else if (action === "confirm-publish-allocation") finalizeAllocationPublication(target.dataset.exam);
  else if (action === "export-seating") exportSeatingCsv(target.dataset.exam);
  else if (action === "print-allocation") printSeatingPlan();
  else if (action === "submit-attendance") confirmAttendanceSubmission();
  else if (action === "confirm-submit-attendance") { closeModal(); submitAttendance(); }
  else if (action === "bulk-attendance") requestBulkAttendance(target.dataset.status);
  else if (action === "confirm-bulk-attendance") {
    if (!pendingBulkAttendance) return;
    const { examId, roomId, rolls, status } = pendingBulkAttendance;
    const exam = examById(examId);
    const sheet = roomAttendance(examId, roomId);
    if (sheet.submitted || (state.role === "incharge" && !exam?.assignments.some((assignment) => assignment.roomId === roomId && assignment.inchargeId === state.selectedIncharge))) { toast("This attendance sheet is no longer available for bulk editing.", true); closeModal(); pendingBulkAttendance = null; return; }
    pendingBulkAttendance = null;
    state.ui.selectedAttendance = [];
    closeModal();
    applyBulkAttendance(examId, roomId, rolls, status);
  }
  else if (action === "open-attendance") { state.ui.page = "attendance"; state.ui.selectedExam = target.dataset.exam; state.ui.selectedRoom = target.dataset.room; render(); }
  else if (action === "exam-allocation") { state.ui.page = "allocations"; state.ui.selectedExam = target.dataset.exam; render(); }
  else if (action === "toggle-student") {
    const student = studentByRoll(target.dataset.roll);
    if (student) { student.active = !student.active; save(); render(); toast(`${student.name} ${student.active ? "activated" : "deactivated"}.`); }
  }
  else if (action === "print-attendance" || action === "print-report" || action === "print-dashboard") window.print();
  else if (action === "export-report") exportCSV(target);
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.name === "role" && target.form?.id === "portalLoginForm") {
    loginRole = target.value;
    loginErrorMessage = "";
    document.querySelectorAll(".login-role-card").forEach((card) => card.classList.toggle("selected", card.contains(target)));
    $("#loginUserId").labels[0].textContent = loginRole === "student" ? "Student ID or Email" : "User ID or Email";
    $("#loginUserId").placeholder = loginRole === "student" ? "Enter your student ID or email" : "Enter your user ID or email";
    $("#loginError").hidden = true;
    return;
  }
  if (target.id === "attendanceExamSelect") {
    state.ui.selectedExam = target.value;
    const available = state.role === "incharge" ? examById(target.value)?.assignments.filter((a) => a.inchargeId === state.selectedIncharge).map((a) => a.roomId) : Object.keys(state.allocations[target.value] || {});
    state.ui.selectedRoom = available?.[0] || "";
    state.ui.selectedAttendance = [];
    state.ui.attendanceSearch = "";
    state.ui.attendanceDepartment = "";
    state.ui.attendanceStatus = "";
    render(); return;
  }
  if (target.id === "attendanceRoomSelect") { state.ui.selectedRoom = target.value; state.ui.selectedAttendance = []; state.ui.attendanceSearch = ""; state.ui.attendanceDepartment = ""; state.ui.attendanceStatus = ""; render(); return; }
  if (target.id === "selectAllAttendance") {
    const rolls = attendanceContexts.get(attendanceKey(state.ui.selectedExam, state.ui.selectedRoom))?.students.map((student) => student.roll) || [];
    state.ui.selectedAttendance = target.checked ? [...rolls] : [];
    save(); render(); return;
  }
  if (target.dataset.attendanceSelect) {
    const selected = new Set(state.ui.selectedAttendance || []);
    if (target.checked) selected.add(target.dataset.attendanceSelect);
    else selected.delete(target.dataset.attendanceSelect);
    state.ui.selectedAttendance = [...selected];
    render();
    window.addEventListener("online", retryAttendanceChanges);
    window.addEventListener("beforeunload", (event) => {
      if (!pendingAttendanceChanges.size) return;
      event.preventDefault();
      event.returnValue = "";
    });
    const checkbox = $(`[data-attendance-select="${target.dataset.attendanceSelect}"]`);
    if (checkbox) checkbox.focus();
    return;
  }
  if (target.id === "allocationExamSelect") {
    state.ui.selectedExam = target.value;
    if (adminToken) {
      SmartExamzSeatingApi.getAllocation(target.value, adminToken).then((data) => {
        syncAllocationPayload(data);
        render();
      }).catch((error) => toast(error.message, true));
    } else render();
    return;
  }
  if (target.dataset.attendanceRoll) {
    const examId = state.ui.selectedExam;
    const roomId = state.ui.selectedRoom;
    const exam = examById(examId);
    if (state.role !== "incharge" || !attendanceToken || !exam?.assignments.some((assignment) => assignment.roomId === roomId && assignment.inchargeId === state.selectedIncharge)) { toast("You are not authorized to change attendance for this room.", true); render(); return; }
    queueAttendanceChange(examId, roomId, target.dataset.attendanceRoll, target.value);
    return;
  }
  if (["dashboardExamFilter", "dashboardCourseFilter", "dashboardDeptFilter", "dashboardDateFilter", "dashboardRoomFilter"].includes(target.id)) filterDashboard();
  if (target.id === "examDeptFilter" || target.id === "examStatusFilter") filterExamCards();
});
document.addEventListener("input", (event) => {
  if (event.target.id === "studentSearch") filterStudentRows(event.target.value);
  if (event.target.id === "examSearch") filterExamCards();
  if (event.target.id === "attendanceSearch") applyAttendanceFilters();
});
document.addEventListener("change", (event) => {
  if (event.target.id === "attendanceDepartmentFilter" || event.target.id === "attendanceStatusFilter") applyAttendanceFilters();
});
function filterStudentRows(query) {
  const term = query.toLowerCase();
  document.querySelectorAll("[data-student-row]").forEach((row) => { row.hidden = !row.dataset.search.includes(term); });
}
function filterExamCards() {
  const dep = $("#examDeptFilter")?.value || "";
  const status = $("#examStatusFilter")?.value || "";
  const term = ($("#examSearch")?.value || "").toLowerCase();
  document.querySelectorAll("[data-exam-card]").forEach((card) => { card.hidden = Boolean((dep && card.dataset.department !== dep) || (status && card.dataset.status !== status) || (term && !card.dataset.search.includes(term))); });
}
document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "portalLoginForm") {
    authenticatePortalUser(form);
    return;
  }
  const data = new FormData(form);
  if (form.id === "databaseStudentForm") {
    if (state.role !== "admin" || !adminToken) {
      toast("An administrator session is required to add roster students.", true);
      return;
    }
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.setAttribute("aria-busy", "true"); }
    SmartExamzStudentApi.createRosterStudent({
      roll: String(data.get("roll") || "").trim(),
      name: String(data.get("name") || "").trim(),
      department: String(data.get("department") || "").trim(),
      year: Number(data.get("year")),
      section: String(data.get("section") || "").trim()
    }, adminToken).then(() => {
      studentRosterState = { ...studentRosterState, status: "idle" };
      closeModal();
      render();
      toast("Database roster record added. Provision an account to enable student sign-in.");
    }).catch((error) => {
      if (handleSessionFailure(error)) return;
      if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); }
      toast(error.message, true);
    });
    return;
  }
  if (form.id === "studentAccountForm") {
    if (state.role !== "admin" || !adminToken) {
      toast("An administrator session is required to provision student accounts.", true);
      return;
    }
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.setAttribute("aria-busy", "true"); }
    SmartExamzStudentApi.provisionAccount({
      studentRoll: form.dataset.studentRoll,
      email: String(data.get("email") || "").trim(),
      password: String(data.get("password") || "")
    }, adminToken).then(() => {
      studentRosterState = { ...studentRosterState, status: "idle" };
      closeModal();
      render();
      toast("Student account saved. Share the initial password securely.");
    }).catch((error) => {
      if (handleSessionFailure(error)) return;
      if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); }
      toast(error.message, true);
    });
    return;
  }
  if (form.id === "adminLoginForm") {
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.setAttribute("aria-busy", "true"); submitButton.textContent = "Signing in…"; }
    SmartExamzSeatingApi.login({ userId: String(data.get("userId")), password: String(data.get("password")) }).then(async (session) => {
      adminToken = session.token;
      const action = pendingAdminAction || { type: "propose", examId: state.ui.selectedExam };
      pendingAdminAction = null;
      closeModal();
      toast("Administrator authenticated for this session.");
      await refreshServerExams();
      if (action.type === "refresh") return;
      if (!state.exams.some((exam) => exam.id === action.examId)) {
        throw new Error("The selected examination is not available in the server database. Select an examination loaded from the server.");
      }
      if (action.type === "publish") publishAllocation(action.examId);
      else if (action.type === "export") exportSeatingCsv(action.examId);
      else if (action.type === "print") printSeatingPlan();
      else proposeAllocation(action.examId);
    }).catch((error) => {
      if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); submitButton.textContent = "Sign in"; }
      toast(error.message, true);
    });
    return;
  }
  if (form.id === "inchargeLoginForm") {
    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.setAttribute("aria-busy", "true"); submitButton.textContent = "Signing in…"; }
    SmartExamzAttendanceApi.login({
      invigilatorId: String(data.get("invigilatorId")),
      password: String(data.get("password"))
    }).then((session) => {
      if (session.role !== "incharge") throw new Error("The server returned a session for a different role.");
      const priorAdminToken = adminToken;
      adminToken = null;
      if (priorAdminToken) SmartExamzAttendanceApi.logout(priorAdminToken).catch((error) => console.warn("Could not end administrator session.", error));
      attendanceToken = session.token;
      authenticatedRole = session.role;
      state.selectedIncharge = session.invigilatorId;
      state.role = "incharge";
      isAuthenticated = true;
      state.ui.page = "attendance";
      const assignment = assignedExams()[0];
      state.ui.selectedExam = assignment?.id || "";
      state.ui.selectedRoom = assignment?.assignments.find((item) => item.inchargeId === state.selectedIncharge)?.roomId || "";
      attendanceContexts.clear();
      attendanceLoadError = "";
      attendanceMutationError = "";
      closeModal();
      render();
      toast(`Signed in as ${staffById(state.selectedIncharge)?.name || "in-charge"}.`);
    }).catch((error) => {
      if (submitButton) { submitButton.disabled = false; submitButton.removeAttribute("aria-busy"); submitButton.textContent = "Sign in"; }
      toast(error.message, true);
    });
    return;
  }
  if (form.id === "examForm") {
    const eligible = data.getAll("eligible").map(String);
    if (!eligible.length) { toast("Choose at least one eligible student.", true); return; }
    const exam = { id: `exam-${crypto.randomUUID()}`, name: String(data.get("name")).trim(), code: String(data.get("code")).trim().toUpperCase(), course: String(data.get("course")).trim(), date: String(data.get("date")), session: String(data.get("session")), department: String(data.get("department")), year: Number(data.get("year")), section: String(data.get("section")), eligible, published: false, assignments: [] };
    const duplicate = state.exams.some((item) => item.code.toLowerCase() === exam.code.toLowerCase() && item.date === exam.date && item.session === exam.session);
    if (duplicate) { toast("An examination already exists for this course code, date and session.", true); return; }
    state.exams.push(exam); state.allocations[exam.id] = {}; state.ui.selectedExam = exam.id; state.ui.page = "allocations"; recordActivity("exam_created", `Created examination: ${exam.course} (${exam.code})`, { examId: exam.id }); closeModal(); save(); render(); toast("Examination created. Allocate rooms to continue.");
  } else if (form.id === "examEditForm") {
    const exam = examById(form.dataset.examId);
    if (!exam) { toast("This examination no longer exists.", true); return; }
    const updated = { ...exam, name: String(data.get("name")).trim(), code: String(data.get("code")).trim().toUpperCase(), course: String(data.get("course")).trim(), date: String(data.get("date")), session: String(data.get("session")) };
    if (state.exams.some((item) => item.id !== exam.id && item.code.toLowerCase() === updated.code.toLowerCase() && item.date === updated.date && item.session === updated.session)) { toast("An examination already exists for this course code, date and session.", true); return; }
    if (Object.keys(state.allocations[exam.id] || {}).some((roomId) => roomCountFor(exam.id, roomId) && roomBookedForSession(roomId, updated))) { toast("The updated date or session conflicts with another examination using an assigned room.", true); return; }
    Object.assign(exam, updated);
    recordActivity("exam_updated", `Updated examination details for ${exam.code}`, { examId: exam.id });
    closeModal(); save(); render(); toast("Examination details updated.");
  } else if (form.id === "roomForm") {
    const room = { number: String(data.get("number")).trim(), building: String(data.get("building")).trim(), capacity: Number(data.get("capacity")), available: data.get("available") === "true" };
    const roomId = form.dataset.roomId;
    if (!room.number || !room.building || !Number.isInteger(room.capacity) || room.capacity < 1) { toast("Enter a room, building and valid positive capacity.", true); return; }
    if (state.rooms.some((item) => item.number.toLowerCase() === room.number.toLowerCase() && item.id !== roomId)) { toast("A room with this number already exists.", true); return; }
    if (roomId) {
      const prior = roomById(roomId);
      if (room.capacity < roomUsage(roomId)) { toast(`Capacity cannot be lower than its current allocation of ${roomUsage(roomId)}.`, true); return; }
      Object.assign(prior, room);
      recordActivity("room_updated", `Updated room ${room.number}`, { roomId });
    } else {
      const created = { id: `room-${crypto.randomUUID()}`, ...room };
      state.rooms.push(created);
      recordActivity("room_created", `Added room ${room.number}`, { roomId: created.id });
    }
    closeModal(); save(); render(); toast(roomId ? "Room details updated." : "Room added.");
  } else if (form.id === "studentForm") {
    const student = { roll: String(data.get("roll")).trim().toUpperCase(), name: String(data.get("name")).trim(), department: String(data.get("department")), year: Number(data.get("year")), section: String(data.get("section")), active: true };
    if (state.students.some((item) => item.roll.toLowerCase() === student.roll.toLowerCase())) { toast("A student with this roll number already exists.", true); return; }
    state.students.push(student); recordActivity("student_created", `Added student ${student.roll} to the directory`); closeModal(); save(); render(); toast("Student added to the directory.");
  }
});
document.addEventListener("change", (event) => {
  if (["examDepartment", "examYear", "examSection"].includes(event.target.id)) {
    const department = $("#examDepartment").value;
    const year = $("#examYear").value;
    const section = $("#examSection").value;
    $("#eligibleStudentList").innerHTML = eligibleCheckboxes(department, year, section);
  }
});
document.addEventListener("keydown", (event) => {
  const dialog = $('[role="dialog"]');
  if (event.key === "Escape") {
    if (dialog) { closeModal(); event.preventDefault(); }
    else if (state.ui.mobileSidebarOpen) { state.ui.mobileSidebarOpen = false; renderNav(); $("#sidebarToggle").focus(); event.preventDefault(); }
    return;
  }
  if (event.key !== "Tab" || !dialog) return;
  const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((element) => element.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
  else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
});

render();
