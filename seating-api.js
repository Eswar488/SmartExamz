"use strict";

(function exposeSeatingApi(root) {
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
    } catch (error) {
      throw new Error(`Network error. Seating changes were not saved: ${error.message}`);
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error(`Seating server returned an invalid response (${response.status}).`);
    }
    if (!response.ok) {
      const error = new Error(payload.error || `Seating request failed (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  const api = {
    login: ({ userId, password }) => request("/api/auth/admin-login", {
      method: "POST", body: { userId, password }
    }),
    listExams: (token) => request("/api/admin/exams", { token }),
    getAllocation: (examId, token) => request(`/api/admin/exams/${encodeURIComponent(examId)}/allocation`, { token }),
    propose: (examId, rules, token) => request(`/api/admin/exams/${encodeURIComponent(examId)}/allocation/propose`, {
      method: "POST", body: rules, token
    }),
    saveDraft: (examId, proposal, token) => request(`/api/admin/exams/${encodeURIComponent(examId)}/allocation/draft`, {
      method: "PUT", body: proposal, token
    }),
    publish: (examId, token) => request(`/api/admin/exams/${encodeURIComponent(examId)}/allocation/publish`, {
      method: "POST", body: {}, token
    }),
    async exportCsv(examId, token) {
      let response;
      try {
        response = await fetch(`/api/admin/exams/${encodeURIComponent(examId)}/allocation/csv`, {
          headers: { Accept: "text/csv", Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        throw new Error(`Network error. Seating export failed: ${error.message}`);
      }
      if (!response.ok) {
        let payload = {};
        try { payload = await response.json(); } catch {}
        const error = new Error(payload.error || `Seating export failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      return response.blob();
    }
  };
  root.SmartExamzSeatingApi = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
