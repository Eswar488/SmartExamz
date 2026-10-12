"use strict";

(function exposeAttendanceApi(root) {
  async function request(path, options = {}, token = "") {
    let response;
    try {
      response = await fetch(path, {
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
    } catch (error) {
      throw new Error(`Network error. Attendance was not saved: ${error.message}`);
    }
    let body;
    try {
      body = await response.json();
    } catch (error) {
      throw new Error(`Attendance server returned an invalid response (${response.status}).`);
    }
    if (!response.ok) {
      const error = new Error(body.error || `Attendance request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return body;
  }

  const api = {
    login: ({ invigilatorId, password }) => request("/api/auth/login", {
      method: "POST", body: JSON.stringify({ invigilatorId, password })
    }),
    getRoom: (examId, roomId, token) => request(
      `/api/attendance?examId=${encodeURIComponent(examId)}&roomId=${encodeURIComponent(roomId)}`,
      {},
      token
    ),
    updateStatus: ({ examId, roomId, studentRoll, status, token }) => request("/api/attendance/records", {
      method: "PATCH",
      body: JSON.stringify({ examId, roomId, studentRoll, status })
    }, token),
    submit: ({ examId, roomId, token }) => request("/api/attendance/submit", {
      method: "POST",
      body: JSON.stringify({ examId, roomId })
    }, token),
    logout: (token) => request("/api/auth/logout", { method: "POST" }, token)
  };
  root.SmartExamzAttendanceApi = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
