"use strict";

(function exposeLoginUtils(root) {
  const roles = new Set(["admin", "student", "incharge"]);

  function validateLoginForm(role, userId, password) {
    if (!roles.has(role)) return "Select a role to continue.";
    if (typeof userId !== "string" || !userId.trim() || typeof password !== "string" || !password) {
      return "Enter your user ID and password.";
    }
    return "";
  }

  const api = { validateLoginForm };
  root.SmartExamzLoginUtils = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
