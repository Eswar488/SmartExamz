# SmartExamz

A university examination management demo using vanilla HTML, CSS, JavaScript, a small Node.js HTTP server, and SQLite for authoritative attendance.

## Run

Use Node.js 22.5 or newer (the built-in `node:sqlite` module is required). No package installation or build step is needed. Configure the in-charge and administrator credentials through environment variables, then start the server:

```sh
HOST=0.0.0.0 \
PORT=4173 \
INCHARGE_CREDENTIALS='{"staff-1":"choose-a-strong-password","staff-2":"choose-another-password"}' \
ADMIN_CREDENTIALS='{"admin-1":"choose-a-strong-admin-password"}' \
node server.js
```

These local-development credential examples use environment configuration only; never commit real credentials. Use a secrets manager and individual identity/password management for production.

The development server binds to `0.0.0.0` by default and prints the Mac's private IPv4 URL at startup. Open the printed `en0` Wi-Fi URL on a phone connected to the same Wi-Fi; use `http://127.0.0.1:4173` on the Mac itself. `PORT`, `HOST`, and `EXAM_DB_PATH` can be configured through environment variables. Set `HOST=127.0.0.1` to restrict access to the Mac. By default, SQLite data is stored at `~/.smartexamz/smartexamz.sqlite`, outside the static file root.

This is for a trusted local network only. Do not configure router port forwarding, expose the server to the public internet, or use production credentials over this development HTTP server. Binding to `0.0.0.0` accepts connections on available interfaces; use a trusted Wi-Fi network and stop the server when finished. Do not disable the macOS firewall. If it blocks incoming Node.js connections, allow the Node process for the private network instead.

## Login roles and sample data

The application opens at the SmartExamz sign-in portal. Admin credentials are checked by `POST /api/auth/admin-login`; in-charge credentials are checked by `POST /api/auth/login`; student credentials are checked by `POST /api/auth/student-login`. Admin and in-charge credentials come from their respective environment-configured maps. Student passwords are individually salted and hashed with Node.js `crypto.scrypt` in SQLite. A session token is held in memory by the current page and is not persisted in localStorage. “Remember my user ID” stores only that identifier; it never stores a password.

Students sign in with a student ID (roster roll number) or their provisioned email. There is no open registration, default password, or seeded student password. An administrator can sign in, open **User Management → Student sign-in accounts**, add a database roster student if needed, then provision/reset that student's account. The same operations are available through the admin-protected `POST /api/admin/students` and `POST /api/admin/student-accounts` APIs; account provisioning also supports existing database roster entries. An omitted email preserves any current email. Provisioning and roster creation are recorded in `audit_events`; the API never returns password hashes. Initial passwords must be at least 12 characters and delivered through a secure channel.

The authenticated Student Dashboard fetches only the profile associated with the server session and that student's future, published seating allocations. Draft allocations are not returned. Results are not implemented and are identified as unavailable. The former localStorage schedule preview is no longer used for student sign-in or display. Student profile/schedule reads are available only through `GET /api/student/dashboard`; the server derives the student identity from the authenticated session and ignores client-supplied student identifiers.

In-charge attendance access is authenticated by the server, and each attendance read, change, and submission is checked against the authenticated in-charge's room assignment. Admin seating operations require an administrator session, with role checks on the protected server routes. The general administration screens remain demo/localStorage-backed; Admin login does not convert those screens into server-authorized CRUD APIs. Student profiles, student accounts, and the student dashboard schedule are database-backed. Sample data includes three examinations, five rooms, 30 students in two departments, published and unpublished allocations, finalized attendance with absentees, and one incomplete attendance sheet. Sample data is seeded only when `NODE_ENV` is unset, `development`, or `test`; staging and production do not seed sample records.

## Attendance database migration

The SQLite schema is migrated sequentially on server startup. Version 2 adds examination cohort/eligibility data, room capacity and availability, draft/published allocation state, a unique seat index, and an allocation audit table. Version 3 adds a unique case-insensitive optional student email, `student_accounts` linked to the roster by student roll, and `audit_events` for administrator roster/account provisioning. Student passwords are stored as a random salt and scrypt hash, never in plaintext. Allocations enforce one room per student for an exam and unique seat numbers within each exam room. The service validates capacity and schedule clashes inside transactions before draft changes or publication.

Existing attendance and seating values in localStorage are not automatically imported: they were editable client-side demo data and cannot be trusted as authoritative records or submissions. Verify any institutional records against an approved source before importing. A migrated database's new room capacities and examination eligibility must be populated from authoritative institutional data; the development seed supplies demo values only. Future schema changes should add sequential migrations and increment `user_version`.

## Seating allocation

On the Seating Plan page, use **Load server exams** to refresh the examination, student eligibility, and room list from SQLite. An authenticated administrator can select a deterministic rule (fewest rooms or balanced distribution; roll ascending or descending), review the server-generated proposal, adjust room/seat values, and save an unpublished draft. The server validates eligibility, student and room timetable clashes, room availability, capacity, duplicate students, and duplicate room seats again when saving. Publication is a separate confirmed operation and cannot replace already-published seating. CSV export and Print view require administrator authentication; printing refreshes the selected allocation from the server first.

## Implemented workflows

- Create and edit examination/course details with cohort-based eligible students and duplicate course/date/session validation.
- Register and edit rooms, with capacity and availability checks.
- Generate draft allocations using the fewest available rooms needed, avoid double-booking a room in the same session, review assignments, select room in-charges, then publish.
- Record Present, Absent, or Unmarked attendance against the server; submission is blocked both in the UI and API until every allocated student is marked.
- Search and filter room attendance by student, department, and attendance status; select all allocated students or apply confirmed bulk status updates.
- Track live attendance counts and progress; review a confirmation dialog and server-issued submission receipt.
- Authenticate invigilators, enforce room assignments server-side, keep a durable attendance audit trail, and retry unsynchronized edits after network failures.
- Print room attendance sheets and report pages; export consolidated absentees as CSV.
- Review room-wise and consolidated absentee statements, department attendance statistics, and pending submissions.
- Review a data-derived administration dashboard with examination, course, department, date, and room filters; room/department attendance charts; upcoming schedules; submission progress; and a persisted administration activity history.
- Use the responsive, keyboard-accessible role login portal, with a show/hide password control, non-persistent password handling, student authentication, a private server-backed Student Dashboard, and session sign-out.
- Navigate with a collapsible desktop sidebar, responsive mobile navigation, keyboard focus handling, skip link, and reduced-motion support.

Run all automated unit and API tests with `node --test`. Student account/authentication and self-scope tests are in `student.test.js`; login validation tests are in `login.test.js`. Dashboard calculations are isolated in `analytics.js`; attendance tests are in `attendance.test.js`, and seating validation, authorization, timetable clashes, draft persistence, publication, and CSV routes are in `seating.test.js`.

Student credentials and accounts are not seeded. For production, require a TLS-terminated deployment, provision roster records from an institution-approved source, and require each student to receive a unique initial password through a secure channel and change it through an institutional password-reset workflow (password reset is not implemented). Sessions remain process-local and are not suitable for a multi-process deployment.
