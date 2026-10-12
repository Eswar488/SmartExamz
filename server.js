"use strict";

const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { migrateAttendanceDatabase, createAttendanceService } = require("./attendance-service.js");
const { seedAttendanceDatabase } = require("./attendance-seed.js");
const { createSeatingService } = require("./seating-service.js");
const { createStudentService } = require("./student-service.js");

const ROOT = __dirname;
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};
const STATIC_FILES = new Set(["index.html", "styles.css", "analytics.js", "login-utils.js", "attendance-api.js", "seating-api.js", "student-api.js", "app.js"]);

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let tooLarge = false;
    request.on("data", (chunk) => {
      if (tooLarge) return;
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        tooLarge = true;
        reject(Object.assign(new Error("Request body is too large."), { status: 413 }));
      }
    });
    request.on("end", () => {
      if (tooLarge) return;
      try {
        const value = raw ? JSON.parse(raw) : {};
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          reject(Object.assign(new Error("Request body must be a JSON object."), { status: 400 }));
          return;
        }
        resolve(value);
      } catch {
        reject(Object.assign(new Error("Request body must be valid JSON."), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function loadCredentials(raw = process.env.INCHARGE_CREDENTIALS) {
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INCHARGE_CREDENTIALS must be a JSON object mapping in-charge IDs to passwords.");
  }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("INCHARGE_CREDENTIALS must be a JSON object mapping in-charge IDs to passwords.");
  }
  return Object.fromEntries(Object.entries(parsed).filter(([id, password]) =>
    typeof id === "string" && typeof password === "string" && password.length > 0
  ));
}

function safePasswordMatches(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function isPrivateIpv4(address) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }
  return octets[0] === 10
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168);
}

function getLocalNetworkUrls(port, interfaces = os.networkInterfaces()) {
  return Object.entries(interfaces)
    .flatMap(([name, addresses]) => (addresses || [])
      .filter((address) => address.family === "IPv4" && !address.internal && isPrivateIpv4(address.address))
      .map((address) => ({ name, url: `http://${address.address}:${port}` })))
    .sort((left, right) => Number(right.name === "en0") - Number(left.name === "en0"));
}

function createAppServer({ db, credentials = {}, adminCredentials = {}, sessionLifetimeMs = 8 * 60 * 60 * 1000 } = {}) {
  const dbPath = process.env.EXAM_DB_PATH || path.join(os.homedir(), ".smartexamz", "smartexamz.sqlite");
  if (!db) fs.mkdirSync(path.dirname(dbPath), { recursive: true, mode: 0o700 });
  const database = db || new DatabaseSync(dbPath);
  if (!db) fs.chmodSync(dbPath, 0o600);
  migrateAttendanceDatabase(database);
  if (!process.env.NODE_ENV || ["development", "test"].includes(process.env.NODE_ENV)) {
    seedAttendanceDatabase(database);
  }
  const attendance = createAttendanceService(database);
  const seating = createSeatingService(database, { invigilatorIds: Object.keys(credentials) });
  const students = createStudentService(database);
  const sessions = new Map();

  function sessionFor(request) {
    const token = /^Bearer ([A-Za-z0-9_-]+)$/.exec(request.headers.authorization || "")?.[1];
    const session = token && sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      if (token) sessions.delete(token);
      throw Object.assign(new Error("Sign in to access this resource."), { status: 401 });
    }
    return session;
  }
  function actorFor(request) {
    const session = sessionFor(request);
    if (session.role !== "incharge") throw Object.assign(new Error("An authenticated invigilator session is required."), { status: 403 });
    return { id: session.invigilatorId };
  }
  function adminFor(request) {
    const session = sessionFor(request);
    if (session.role !== "admin") throw Object.assign(new Error("An authenticated administrator session is required."), { status: 403 });
    return { id: session.userId };
  }
  function studentFor(request) {
    const session = sessionFor(request);
    if (session.role !== "student") throw Object.assign(new Error("An authenticated student session is required."), { status: 403 });
    return { roll: session.studentRoll };
  }

  function json(response, statusCode, body) {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify(body));
  }

  async function handleApi(request, response, url) {
    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const { invigilatorId, password } = await readJsonBody(request);
      const expected = typeof invigilatorId === "string" && Object.hasOwn(credentials, invigilatorId)
        ? credentials[invigilatorId] : "";
      if (!expected || typeof password !== "string" || !safePasswordMatches(password, expected)) {
        return json(response, 401, { error: "Invalid invigilator credentials." });
      }
      const token = crypto.randomBytes(32).toString("base64url");
      sessions.set(token, { role: "incharge", invigilatorId, expiresAt: Date.now() + sessionLifetimeMs });
      return json(response, 200, { token, role: "incharge", invigilatorId, expiresAt: new Date(Date.now() + sessionLifetimeMs).toISOString() });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/admin-login") {
      const { userId, password } = await readJsonBody(request);
      const expected = typeof userId === "string" && Object.hasOwn(adminCredentials, userId)
        ? adminCredentials[userId] : "";
      if (!expected || typeof password !== "string" || !safePasswordMatches(password, expected)) {
        return json(response, 401, { error: "Invalid administrator credentials." });
      }
      const token = crypto.randomBytes(32).toString("base64url");
      sessions.set(token, { role: "admin", userId, expiresAt: Date.now() + sessionLifetimeMs });
      return json(response, 200, { token, role: "admin", userId, expiresAt: new Date(Date.now() + sessionLifetimeMs).toISOString() });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/student-login") {
      const { userId, password } = await readJsonBody(request);
      const account = await students.authenticate(userId, password);
      if (!account) return json(response, 401, { error: "Invalid student credentials." });
      const token = crypto.randomBytes(32).toString("base64url");
      const expiresAt = Date.now() + sessionLifetimeMs;
      sessions.set(token, { role: "student", studentRoll: account.studentRoll, expiresAt });
      return json(response, 200, {
        token, role: "student", studentRoll: account.studentRoll,
        expiresAt: new Date(expiresAt).toISOString()
      });
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const token = /^Bearer ([A-Za-z0-9_-]+)$/.exec(request.headers.authorization || "")?.[1];
      if (token) sessions.delete(token);
      return json(response, 200, { ok: true });
    }

    if (request.method === "POST" && url.pathname === "/api/admin/student-accounts") {
      const actor = adminFor(request);
      const body = await readJsonBody(request);
      return json(response, 201, await students.provisionAccount(body, actor.id));
    }

    if (request.method === "POST" && url.pathname === "/api/admin/students") {
      const actor = adminFor(request);
      const body = await readJsonBody(request);
      return json(response, 201, students.createRosterStudent(body, actor.id));
    }

    if (request.method === "GET" && url.pathname === "/api/admin/students") {
      adminFor(request);
      return json(response, 200, { students: students.listRosterStudents() });
    }

    if (request.method === "GET" && url.pathname === "/api/student/dashboard") {
      const actor = studentFor(request);
      return json(response, 200, students.getDashboard(actor.roll));
    }

    if (request.method === "GET" && url.pathname === "/api/admin/exams") {
      adminFor(request);
      return json(response, 200, seating.listExams());
    }

    const allocationRoute = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/allocation(?:\/(propose|draft|publish|csv))?$/);
    if (allocationRoute) {
      const actor = adminFor(request);
      const examId = decodeURIComponent(allocationRoute[1]);
      const action = allocationRoute[2] || "";
      if (request.method === "GET" && !action) return json(response, 200, seating.allocationData(examId));
      if (request.method === "POST" && action === "propose") {
        const body = await readJsonBody(request);
        return json(response, 200, seating.propose({ examId, roomStrategy: body.roomStrategy, studentOrder: body.studentOrder }));
      }
      if (request.method === "PUT" && action === "draft") {
        const body = await readJsonBody(request);
        return json(response, 200, seating.saveDraft({
          examId, assignments: body.assignments, roomIncharges: body.roomIncharges, actorId: actor.id
        }));
      }
      if (request.method === "POST" && action === "publish") {
        return json(response, 200, seating.publish({ examId, actorId: actor.id }));
      }
      if (request.method === "GET" && action === "csv") {
        const csv = seating.csv(examId);
        response.writeHead(200, {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="seating-${encodeURIComponent(examId)}.csv"`,
          "Cache-Control": "no-store"
        });
        response.end(csv);
        return;
      }
      return json(response, 405, { error: "Method not allowed for this allocation resource." });
    }

    if (request.method === "GET" && url.pathname === "/api/attendance") {
      const actor = actorFor(request);
      const examId = url.searchParams.get("examId");
      const roomId = url.searchParams.get("roomId");
      if (!examId || !roomId) return json(response, 400, { error: "examId and roomId are required." });
      return json(response, 200, attendance.getAttendance(examId, roomId, actor.id));
    }

    if (request.method === "PATCH" && url.pathname === "/api/attendance/records") {
      const actor = actorFor(request);
      const body = await readJsonBody(request);
      const result = attendance.changeAttendance({
        examId: body.examId, roomId: body.roomId, studentRoll: body.studentRoll,
        status: body.status, actorId: actor.id
      });
      return json(response, 200, result);
    }

    if (request.method === "POST" && url.pathname === "/api/attendance/submit") {
      const actor = actorFor(request);
      const body = await readJsonBody(request);
      return json(response, 201, attendance.submitAttendance({
        examId: body.examId, roomId: body.roomId, actorId: actor.id
      }));
    }

    return json(response, 404, { error: "API route not found." });
  }

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      Promise.resolve(handleApi(request, response, url)).catch((error) => {
        if (response.headersSent || response.destroyed) return;
        const status = Number.isInteger(error.status) ? error.status : 500;
        if (status >= 500) console.error("Attendance API failure:", error);
        json(response, status, { error: status >= 500 ? "Attendance service is temporarily unavailable." : error.message });
      });
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end();
      return;
    }
    let filePath;
    try {
      const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
      filePath = path.resolve(ROOT, `.${requestedPath}`);
    } catch {
      response.writeHead(400);
      response.end("Invalid path.");
      return;
    }
    if (!filePath.startsWith(`${ROOT}${path.sep}`) || path.dirname(filePath) !== ROOT || !STATIC_FILES.has(path.basename(filePath))) {
      response.writeHead(403);
      response.end("Forbidden.");
      return;
    }
    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500);
        response.end(error.code === "ENOENT" ? "Not found." : "Unable to read requested file.");
        return;
      }
      response.writeHead(200, { "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream" });
      response.end(request.method === "HEAD" ? undefined : content);
    });
  });

  server.on("close", () => {
    database.close();
    sessions.clear();
  });
  return server;
}

if (require.main === module) {
  const credentials = loadCredentials();
  const adminCredentials = loadCredentials(process.env.ADMIN_CREDENTIALS || "");
  const server = createAppServer({ credentials, adminCredentials });
  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || 4173);
  server.listen(port, host, () => {
    const listeningPort = server.address().port;
    if (host === "0.0.0.0") {
      console.log(`SmartExamz is listening on all network interfaces at port ${listeningPort}.`);
      console.log(`On this Mac: http://127.0.0.1:${listeningPort}`);
      const localUrls = getLocalNetworkUrls(listeningPort);
      if (localUrls.length) {
        console.log("Local network URLs (use the address on the same Wi-Fi network as your phone):");
        localUrls.forEach(({ name, url }) => console.log(`  ${url} (${name})`));
      } else {
        console.log("No private IPv4 network address was found; check that Wi-Fi is connected.");
      }
    } else {
      console.log(`SmartExamz is available at http://${host}:${listeningPort}`);
    }
    if (!Object.keys(credentials).length) {
      console.warn("Attendance sign-in is disabled until INCHARGE_CREDENTIALS is configured.");
    }
  });
}

module.exports = { createAppServer, getLocalNetworkUrls, loadCredentials };
