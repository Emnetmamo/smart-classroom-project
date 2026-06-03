
## Landing: Portal Selector

A new landing screen with 3 large cards:

1. **System Portal** — opens directly (no login). Contains everything the app has today: Dashboard, Face Attendance, RFID, Light, Temperature, Air, Attention, Screen Sharing, Recording, plus the upgraded **Admin (Coordinator)** workspace.
2. **Instructor Portal** — login required. Instructor sees their own dashboard.
3. **Student Portal** — login required. Student sees their own materials/schedule.

Top-right "Switch portal" button on every screen returns to the selector.

## Credentials (in-memory, no backend)

- Instructors — username = teacher shortname (e.g. `ayalew`, `dagmawi`), password = `Teacher@1234`
- Students — username = first name lowercase (`abera`, `emnet`, …), password = `<FirstName>@1234` (e.g. `Abera@1234`)

If you want real auth later say the word and I'll wire Lovable Cloud.

## A) System Portal (existing modules, upgraded)

- **Face Attendance** — add multi-face simulation (a "Detect classroom" button marks 2–4 students at once with toasts; duplicates show "Already marked via RFID/Face"). Real portrait avatars for **Betelihem Solomon** and **Emnet Mamo** (from the doc) and for **Dr. Dagmawi** and **Dr. Ayalew**; rest stay initials.
- **Lateness rules** (face + RFID): on time / warning (≥10 min after start) / late (≥30 min). Uses a **simulated clock** the user controls (not wall-clock) so the demo can jump forward.
- **Per-course activation** — attendance is only open when the coordinator/instructor "starts" the active session; closing it ends it. Each session keeps its own roster.
- **Slides ↔ teacher** — placeholder decks for 2–3 courses; when the verified instructor matches the active session, the slide preview auto-loads in Screen Sharing.
- **Admin tab → Coordinator workspace** with sub-tabs:
  1. Dashboard (instructors, courses, classrooms, scheduled counts; today + upcoming; rooms availability)
  2. Instructors (add/edit/delete: empID, name, email, phone, dept)
  3. Students (existing 10 + add/edit/delete)
  4. Classrooms (name, capacity, building, floor, equipment)
  5. Courses (code, name, instructor, #students, duration)
  6. Schedule course (course/room/instructor/day Mon–Sat/start/end/regular|makeup)
  7. View schedule (table + edit/delete)
  8. Analytics (recharts: utilization, hours per instructor, classes per day, equipment)
  9. Export (CSV download real; "PDF/Excel" = CSV with hint; Print = window.print)
  10. Bulk emails (group + course filter + subject + body → `mailto:`)
  11. Notifications (in-app inbox from instructors/students)

## B) Instructor Portal (login)

- Dashboard: total classes, teaching hours (computed from sessions).
- My schedule: list sessions, reschedule to another free slot (validates room not double-booked); enrolled students get an in-app notification.
- Inbox: messages from students or coordinator; compose to coordinator.
- Logout / Switch portal.

## C) Student Portal (login)

- My schedule (sessions for room A319 they attend).
- Materials & Recordings grouped by course (preloaded slides + a simulated "Recording — <date>" entry per completed session).
- Compose notification to instructor/coordinator.
- Logout / Switch portal.

## Files

```text
src/lib/classroom-store.tsx         + auth, lateness, multi-face, CRUD, notifications, makeup, sim clock
src/components/classroom/PortalSelector.tsx     NEW landing
src/components/classroom/Login.tsx              NEW (used for Instructor & Student)
src/components/classroom/Shell.tsx              accept portal prop, hide irrelevant nav
src/components/classroom/modules/FaceAttendance.tsx    multi-face + lateness + portraits
src/components/classroom/modules/RfidAttendance.tsx    lateness
src/components/classroom/modules/ScreenAndRecording.tsx  teacher-bound slides
src/components/classroom/modules/coordinator/*.tsx     NEW (11 sub-views) — replaces SystemAdmin
src/components/classroom/modules/instructor/*.tsx      NEW
src/components/classroom/modules/student/*.tsx         NEW
src/assets/betty.jpg, emnet.jpg, dr-dagmawi.jpg, dr-ayalew.jpg   from doc
src/routes/index.tsx                portal selector → portal shells
```

No new route files needed — selector is conditional UI inside `index.tsx` (keeps the current single-page SSR working).

## Scope notes

- Demo auth only (in-memory). Tell me if you want Lovable Cloud auth.
- `mailto:` for bulk email (no SMTP). Print/CSV are real; PDF/XLSX = CSV with note.
- Sim clock replaces wall-clock for schedule "active" calc so lateness rules can be demoed.

Shipping it all in one pass unless you say stage it.
