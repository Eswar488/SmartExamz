"use strict";

(function exposeStudentApi(root) {
  async function request(path, { method = "GET", body, token } = {}) {
    let response;
    try {
      response = await fetch(path, {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      });
    } catch {
      throw new Error("A network error prevented the request. Please try again.");
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`The server returned an invalid response (${response.status}).`);
    }
    if (!response.ok) {
      const error = new Error(payload.error || `Student request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  const api = {
    login: ({ userId, password }) => request("/api/auth/student-login", {
      method: "POST", body: { userId, password }
    }),
    getDashboard: (token) => request("/api/student/dashboard", { token }),
    createRosterStudent: (student, token) => request("/api/admin/students", {
      method: "POST", body: student, token
    }),
    listRosterStudents: (token) => request("/api/admin/students", { token }),
    provisionAccount: ({ studentRoll, email, password }, token) => request("/api/admin/student-accounts", {
      method: "POST", body: { studentRoll, email, password }, token
    })
  };
  root.SmartExamzStudentApi = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
