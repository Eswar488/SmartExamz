"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateLoginForm } = require("./login-utils.js");

test("login form rejects a missing role, blank ID, or blank password", () => {
  assert.equal(validateLoginForm("", "user-1", "password"), "Select a role to continue.");
  assert.equal(validateLoginForm("admin", "  ", "password"), "Enter your user ID and password.");
  assert.equal(validateLoginForm("incharge", "user-1", ""), "Enter your user ID and password.");
  assert.equal(validateLoginForm("student", "", "password"), "Enter your user ID and password.");
  assert.equal(validateLoginForm("student", "S1", ""), "Enter your user ID and password.");
});

test("admin and in-charge roles are eligible for server authentication", () => {
  assert.equal(validateLoginForm("admin", "admin-1", "password"), "");
  assert.equal(validateLoginForm("incharge", "staff-1", "password"), "");
});

test("all supported roles can submit non-empty credentials for server authentication", () => {
  assert.equal(validateLoginForm("student", "ST24001", "password"), "");
});
